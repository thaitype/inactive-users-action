const core = require('@actions/core');
const fs = require('fs')
  , path = require('path')
const util = require('../dateUtil');

/**
 * Hotfix func to debug some user
 * @param {string|undefined} logUser 
 * @param {string|undefined} login 
 * @param {any} issue 
 * @returns 
 */
function logIssueActivity(logUser, login, issue) {
  if (logUser === undefined) return;
  if(logUser !== login) return;
  console.log(`Log Issue ${issue.title} by ${login}`);
  // TODO: Hard code to get outdir from github actions inputs
  const outputDir = core.getInput('outputDir', {required: true});

  const file = path.join(outputDir, 'issue_activity.log');
  fs.appendFileSync(file, `${login} - ${issue.title}\n`);
  fs.appendFileSync(file, `Issue: ${JSON.stringify(issue, null, 2)}`);

   // Expose the output log user issue activity file
   core.setOutput('issue_activity_log', file);
}

module.exports = class IssueActivity {

  constructor(octokit) {
    if (!octokit) {
      throw new Error('An octokit client must be provided');
    }
    this._octokit = octokit;
  }

  getIssueActivityFrom(owner, repo, since, logUser) {
    const from = util.getFromDate(since)
      , repoFullName = `${owner}/${repo}`
    ;

    return this.octokit.paginate('GET /repos/:owner/:repo/issues',
      {
        owner: owner,
        repo: repo,
        since: from,
        per_page: 100,
      }
    ).then(issues => {
      const users = {};

      issues.forEach(issue => {
        if (issue.user && issue.user.login) {
          const login = issue.user.login;

          logIssueActivity(logUser, login, issue);

          if (!users[login]) {
            users[login] = 1;
          } else {
            users[login] = users[login] + 1;
          }
        }
      });

      const data = {}
      data[repoFullName] = users;
      return data;
    }).catch(err => {
      if (err.status === 404) {
        return {};
      } else {
        console.error(err)
        throw err;
      }
    });
  }

  getIssueCommentActivityFrom(owner, repo, since) {
    const from = util.getFromDate(since)
      , repoFullName = `${owner}/${repo}`
    ;

    return this.octokit.paginate('GET /repos/:owner/:repo/issues/comments',
      {
        owner: owner,
        repo: repo,
        since: from,
        per_page: 100,
      }
    ).then(comments => {
      const users = {};

      comments.forEach(comment => {
        if (comment.user && comment.user.login) {
          const login = comment.user.login;

          if (!users[login]) {
            users[login] = 1;
          } else {
            users[login] = users[login] + 1;
          }
        }
      });

      const data = {}
      data[repoFullName] = users;
      return data;
    }).catch(err => {
      if (err.status === 404) {
        //TODO could log this out
        return {};
      } else {
        console.error(err)
        throw err;
      }
    })
  }

  get octokit() {
    return this._octokit;
  }
}