import React from 'react'

const notificationBar = ({ uiStatus }) => {
    const { loading, success, error } = uiStatus;

    // Determine which type to show
    let type = null;
    let message = "";

    if (loading) {
        type = "loading";
        message = "Processing images...";
    } else if (success) {
        type = "success";
        message = success;
    } else if (error) {
        type = "error";
        message = error;
    }

    if (!type) return null;

    const typeStyles = {
        success: "bg-green-500 text-white",
        error: "bg-red-500 text-white",
        loading: "bg-yellow-400 text-black",
    };

    const icons = {
        success: "✅",
        error: "❌",
        loading: "⏳",
    };

    return (
        <div
            className={`notification fixed bottom-10 right-10 flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg z-50 transition-all duration-300
        ${typeStyles[type]}`}
        >
            <span className="text-2xl">{icons[type]}</span>
            <span className="font-medium text-lg">{message}</span>
        </div>
    );
};



export default notificationBar