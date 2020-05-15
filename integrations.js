const integrations = {}
// TODO: Add integrations for Github Projects and others as requested

/*
    This Regex is a little complex, so here's a quick breakdown:
    The first part is a non-capturing group which represents the three
    matching conditions. Each of these is comprised of 1) the notation
    for the left side of the story number and 2) a positive lookahead
    consisting of the story number and the closing notation
    - The square bracket notation: [ch######]
      - \[ch(?=\d+\])
    - The URL notation: https://app.clubhouse.com/orgname/story/######/*
      - app\.clubhouse\.io\/[^/]+\/story\/(?=\d+\/)
    - The branch name notation: (anything/)?ch######/anything
      - ^[/a-zA-Z0-9_-]*?ch(?=\d+\/[/a-zA-Z0-9_-]+?$)

    When any of these three match, the match will continue starting from
    the end of the non-capturing group, and will capture the story number
    as a named capture with (?<story>\d+)
*/
integrations.clubhouse = /(?:\[ch(?=\d+\])|app\.clubhouse\.io\/[^/]+\/story\/(?=\d+\/)|^[/a-zA-Z0-9_-]*?ch(?=\d+\/[/a-zA-Z0-9_-]+?$))(?<story>\d+)/gi

module.exports = integrations