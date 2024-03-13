const { database } = require('../server');

function getUser(url, request) {
  const username = url.split('/').filter(segment => segment)[1];
  const user = database.users[username];
  const response = {};

  if (user) {
    const userArticles = user.articleIds.map(
      articleId => database.articles[articleId]);
    const userComments = user.commentIds.map(
      commentId => database.comments[commentId]);
    response.body = {
      user: user,
      userArticles: userArticles,
      userComments: userComments
    };
    response.status = 200;
  } else if (username) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}
exports.getUser = getUser;
function getOrCreateUser(url, request) {
  const username = request.body && request.body.username;
  const response = {};

  if (database.users[username]) {
    response.body = { user: database.users[username] };
    response.status = 200;
  } else if (username) {
    const user = {
      username: username,
      articleIds: [],
      commentIds: []
    };
    database.users[username] = user;

    response.body = { user: user };
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}
exports.getOrCreateUser = getOrCreateUser;
