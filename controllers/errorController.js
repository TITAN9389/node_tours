const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
  const msg = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(msg, 400);
};

const handleDuplicateFieldsDB = err => {
  const val = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const msg = `Duplicate field value: ${val}. Please use another value!`;
  return new AppError(msg, 400);
};

const handleValidationErrorDB = err => {
  const errors = Object.values(err.errors).map(val => val.message);
  const msg = `Invalid input data. ${errors.join(' *')}`;
  return new AppError(msg, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });

    // Programming or other unknown error : don't leak details to client
  } else {
    // 1) Log error
    // eslint-disable-next-line no-console
    console.error('ERROR 💥', err);

    // 2) Send generic error
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong'
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    sendErrorProd(error, res);
  }
};
