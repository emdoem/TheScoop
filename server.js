const http = require('http');
const url = require('url');
const { requestHandler } = require('./backend/requestHandler');
const { getOrCreateUser, getUser } = require('./backend/user_handlers');
const { getArticles, createArticle, getArticle, updateArticle, deleteArticle, upvoteArticle, downvoteArticle } = require('./backend/article_handlers');
const { upvote, downvote } = require('./backend/voting_handlers');

// database is let instead of const to allow us to modify it in test.js
let database = {
  users: {},
  articles: {},
  nextArticleId: 1,
  comments: {},
  nextCommentId: 1
};
exports.database = database;

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
  } else if(requestComment && requestComment.body && id) {
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