export const errorHandler = (err, req, res, next) => {
  console.error('[SERVER ERROR]:', err.message);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds maximum permitted limit (15MB).' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: err.message || 'Internal server error occurred.',
    timestamp: new Date().toISOString()
  });
};
