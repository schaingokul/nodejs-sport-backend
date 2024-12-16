
export class ErrorHandler extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

// Middleware to handle errors:
export const handleErrors = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Error Handler", statusCode, message);
    next()
    res.status(statusCode).json({
        status: true,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};


export const sendErrorResponse = (res, statusCode, message, errorDetail, errorCode = null) => {
    console.error(`[${new Date().toISOString()}] Error: ${message}`, errorDetail);
    res.status(statusCode).json({ status: false, message, errorCode, errorDetail });
};