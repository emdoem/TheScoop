const { upvote, downvote } = require('./voting_handlers');
const { database } = require('../server');

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
exports.upvoteComment = upvoteComment;
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
exports.downvoteComment = downvoteComment;
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
exports.deleteComment = deleteComment;
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
exports.updateComment = updateComment;
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
exports.createComment = createComment;
