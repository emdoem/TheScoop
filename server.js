const http = require('http');
const url = require('url');
const { requestHandler } = require('./backend/requestHandler');
const { upvote, downvote } = require("./backend/voting_handlers");

const routes = {
  '/users': {
    'POST': getOrCreateUser
  },
  '/users/:username': {
    'GET': getUser
  },
  '/articles': {
    'GET': getArticles,
    'POST': createArticle
  },
  '/articles/:id': {
    'GET': getArticle,
    'PUT': updateArticle,
    'DELETE': deleteArticle
  },
  '/articles/:id/upvote': {
    'PUT': upvoteArticle
  },
  '/articles/:id/downvote': {
    'PUT': downvoteArticle
  },
  '/comments': {
    'POST': createComment
  },
  '/comments/:id': {
    'PUT': updateComment,
    'DELETE': deleteComment
  },
  '/comments/:id/upvote': {
    'PUT': upvoteComment
  },
  '/comments/:id/downvote': {
    'PUT': downvoteComment
  }
};
exports.routes = routes;

// Write all code above this line.

const port = process.env.PORT || 4000;
const isTestMode = process.env.IS_TEST_MODE;
exports.isTestMode = isTestMode;

const getRequestRoute = (url) => {
  const pathSegments = url.split('/').filter(segment => segment);

  if (pathSegments.length === 1) {
    return `/${pathSegments[0]}`;
  } else if (pathSegments[2] === 'upvote' || pathSegments[2] === 'downvote') {
    return `/${pathSegments[0]}/:id/${pathSegments[2]}`;
  } else if (pathSegments[0] === 'users') {
    return `/${pathSegments[0]}/:username`;
  } else {
    return `/${pathSegments[0]}/:id`;
  }
};
exports.getRequestRoute = getRequestRoute;

if (typeof loadDatabase === 'function' && !isTestMode) {
  const savedDatabase = loadDatabase();
  if (savedDatabase) {
    for (key in database) {
      database[key] = savedDatabase[key] || database[key];
    }
  }
}

const server = http.createServer(requestHandler);

server.listen(port, (err) => {
  if (err) {
    return console.log('Server did not start succesfully: ', err);
  }

  console.log(`Server is listening on ${port}`);
});

// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  comments: {},
  nextCommentId: 1
};

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

function getArticles(url, request) {
  const response = {};

  response.status = 200;
  response.body = {
    articles: Object.keys(database.articles)
      .map(articleId => database.articles[articleId])
      .filter(article => article)
      .sort((article1, article2) => article2.id - article1.id)
  };

  return response;
}

function getArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const article = database.articles[id];
  const response = {};

  if (article) {
    article.comments = article.commentIds.map(
      commentId => database.comments[commentId]);

    response.body = { article: article };
    response.status = 200;
  } else if (id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createArticle(url, request) {
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (requestArticle && requestArticle.title && requestArticle.url &&
    requestArticle.username && database.users[requestArticle.username]) {
    const article = {
      id: database.nextArticleId++,
      title: requestArticle.title,
      url: requestArticle.url,
      username: requestArticle.username,
      commentIds: [],
      upvotedBy: [],
      downvotedBy: []
    };

    database.articles[article.id] = article;
    database.users[article.username].articleIds.push(article.id);

    response.body = { article: article };
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}

function updateArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const requestArticle = request.body && request.body.article;
  const response = {};

  if (!id || !requestArticle) {
    response.status = 400;
  } else if (!savedArticle) {
    response.status = 404;
  } else {
    savedArticle.title = requestArticle.title || savedArticle.title;
    savedArticle.url = requestArticle.url || savedArticle.url;

    response.body = { article: savedArticle };
    response.status = 200;
  }

  return response;
}

function deleteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const savedArticle = database.articles[id];
  const response = {};

  if (savedArticle) {
    database.articles[id] = null;
    savedArticle.commentIds.forEach(commentId => {
      const comment = database.comments[commentId];
      database.comments[commentId] = null;
      const userCommentIds = database.users[comment.username].commentIds;
      userCommentIds.splice(userCommentIds.indexOf(id), 1);
    });
    const userArticleIds = database.users[savedArticle.username].articleIds;
    userArticleIds.splice(userArticleIds.indexOf(id), 1);
    response.status = 204;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = upvote(savedArticle, username);

    response.body = { article: savedArticle };
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteArticle(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedArticle = database.articles[id];
  const response = {};

  if (savedArticle && database.users[username]) {
    savedArticle = downvote(savedArticle, username);

    response.body = { article: savedArticle };
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function upvoteComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedComment = database.comments[id];
  const response = {};

  if (savedComment && database.users[username]) {
    savedComment = upvote(savedComment, username);

    response.body = { comment: savedComment };
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function downvoteComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const username = request.body && request.body.username;
  let savedComment = database.comments[id];
  const response = {};

  if (savedComment && database.users[username]) {
    savedComment = downvote(savedComment, username);

    response.body = { comment: savedComment };
    response.status = 200;
  } else {
    response.status = 400;
  }

  return response;
}

function deleteComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const requestComment = database.comments[id];
  const response = {};

  if (requestComment && requestComment.body &&
    requestComment.username && database.users[requestComment.username]) {
    database.comments[id] = null;

    // remove references to comment
    database.users[requestComment.username].commentIds = database.users[requestComment.username].commentIds
      .filter(commentId => commentId != id);
    database.articles[requestComment.articleId].commentIds = database.articles[requestComment.articleId].commentIds
      .filter(commentId => commentId != id);


    response.body = { comment: requestComment };
    response.status = 204;
  } else {
    response.status = 404;
  }

  return response;
}

function updateComment(url, request) {
  const id = Number(url.split('/').filter(segment => segment)[1]);
  const requestComment = request.body && request.body.comment;
  const response = {};

  if (requestComment && requestComment.body &&
    // requestComment.username && database.users[requestComment.username] && - these don't get passed here
    id && database.comments[id]) {
    const comment = {
      id: database.comments[id].id,
      body: requestComment.body,
      username: database.comments[id].username,
      articleId: database.comments[id].articleId,
      upvotedBy: database.comments[id].upvotedBy,
      downvotedBy: database.comments[id].downvotedBy
    };

    database.comments[id] = comment;

    response.body = { comment: comment };
    response.status = 200;
  } else if (requestComment && requestComment.body && id) {
    response.status = 404;
  } else {
    response.status = 400;
  }

  return response;
}

function createComment(url, request) {
  const requestComment = request.body && request.body.comment;
  const response = {};

  if (requestComment && requestComment.body &&
    requestComment.username && database.users[requestComment.username] &&
    requestComment.articleId && database.articles[requestComment.articleId]) {
    const comment = {
      id: database.nextCommentId++,
      body: requestComment.body,
      username: requestComment.username,
      articleId: requestComment.articleId,
      upvotedBy: [],
      downvotedBy: []
    };

    database.comments[comment.id] = comment;
    database.users[comment.username].commentIds.push(comment.id);
    database.articles[comment.articleId].commentIds.push(comment.id);

    response.body = { comment: comment };
    response.status = 201;
  } else {
    response.status = 400;
  }

  return response;
}
