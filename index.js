const core = require('@actions/core')
const github = require('@actions/github')
const { execSync } = require('child_process')
const moment = require('moment')
const integrations = require('./integrations')
const inspect = require('util').inspect
const pp = v => console.log(inspect(v, { showHidden: false, depth: null, colors: false }))

const octokit = new github.GitHub(core.getInput('repo-token'));
const { owner, repo } = github.context.repo

const base = core.getInput('base-branch')
const head = core.getInput('head-branch')
const clubhouseOrg = core.getInput('clubhouse-org')

/*
    GH auto-populates the action with a shallow clone
    of just the current branch... so we need to get some
    history to compare against. We don't want the
    entire lifetime of the repo, so we'll do a shallow
    clone of history since a given moment in the near past.

    We need this to diff the base and head branches for the
    automatic PR to determine if there are any merge commits
    that need to have a PR opened.

    Defaults to 3 months ago, since there really shouldn't
    be something more than a month old sitting in the head
    branch, but _just in case_.
*/
const commitAge = core.getInput('max-commit-age')
const commitAgeUnit = core.getInput('commit-age-units')
const earliestCommitDate = moment().subtract(parseInt(commitAge), commitAgeUnit).format('YYYY-MM-DD')

const git = {
    fetch: {
        base: `git fetch --no-tags -f origin ${base}:${base} --shallow-since=${earliestCommitDate}`,
        head: `git fetch --no-tags -f origin ${head}:${head} --shallow-since=${earliestCommitDate}`
    },
    checkout: {
        base: `git checkout -B ${base} origin/${base}`,
        head: `git checkout -B ${head} origin/${head}`
    },
    pull: `git pull`,
    merges: `git log --merges ${base}..${head} --format=format:%H`,
    log: 'git log',
    branch: 'git branch'
}
execSync(git.fetch.base)
execSync(git.checkout.base)
execSync(git.pull)
execSync(git.fetch.head)
execSync(git.checkout.head)
execSync(git.pull)
let mergeCommits = execSync(git.merges).toString().split('\n')

if(mergeCommits.length > 0) {
    handle(mergeCommits.reverse())
}

async function reduceAsync(array, handler, accumulator) {
    let res = accumulator;

    for(const item of array) {
        res = await handler(res, item)
    }

    return res
}

async function handle(shaArray) {
    const prs = await reduceAsync(shaArray, async (acc, sha) => {
        if(sha.length === 0) { return acc }
        let stories

        const { data: { items: [ pull ] } } = await octokit.search.issuesAndPullRequests({
            q: sha
            + 'type:pr'
            + `+base:${head}`
            + "+is:merged",
        })
        pp(pull)

        if(clubhouseOrg){
            // for whatever reason, comments on a PR that aren't part of a Review
            // get attached to the invisible Issue associated with each PR
            const { data: comments } = await octokit.issues.listComments({
                owner,
                repo,
                issue_number: pull.number
            })

            const { data: { head: { ref: branch } } } = await octokit.pulls.get({
                owner,
                repo,
                pull_number: pull.number
            })

            const bodies = comments.map(comment => comment.body)
            bodies.unshift(pull.body)
            bodies.unshift(branch)

            // get all the comment bodies into an array `bodies`
            stories = bodies.reduce((acc, text) => {
                const storyMatches = Array.from(text.matchAll(integrations.clubhouse))

                storyMatches.forEach(match => {
                    const { groups: { story } } = match
                    if (!acc.includes(story)) acc.push(story)
                })
                return acc
            }, [])
        }

        acc[sha] = {
            title: pull.title,
            number: pull.number,
            link: pull.html_url,
            stories
        }
        return acc
    }, {})

    let body = `Incorporates changes from the following PRs in \`${head}\``
    for (const [sha, pull] of Object.entries(prs)) {
        body += '\n' +
            `- [#${pull.number} ${pull.title}](${pull.link}) (merge SHA ${sha})`

        if(clubhouseOrg){
            // TODO: Investigate using the Clubhouse API to both get richer story
            // info _and_ to explicitly attach the AutoPR to stories instead of
            // relying on the webhook integration.
            pull.stories.forEach(story => {
                body += '\n' +
                    `  - [[ch${story}]](https://app.clubhouse.com/${clubhouseOrg}/story/${story}/)`
            })
        }

        body += '\n'
    }
    body.replace(/\n$/, '')

    const { data: existingPRs } = await octokit.pulls.list({
        owner,
        repo,
        head,
        base,
        state: 'open'
    })

    pp(existingPRs)

    const title = `AutoPR: Promote changes from ${head} to ${base}`
    if(existingPRs.length === 0) {
        await octokit.pulls.create({
            owner,
            repo,
            title,
            head,
            base,
            body
        })
    } else {
        const prIndex = existingPRs.findIndex(pr => {
            return pr.title === title
        })
        const bodyHasDiffs = existingPRs[prIndex].body !== body

        if(prIndex >= 0 && bodyHasDiffs) {
            // TODO: Determine which stories will be added during this change,
            // and add them in a comment on the PR so they get picked up by the
            // integration. In the meantime, stories are linked.
            const pull_number = existingPRs[prIndex].number
            await octokit.pulls.update({
                owner,
                repo,
                pull_number,
                body
            })
        }
    }
}