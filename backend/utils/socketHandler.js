socket.on('chat:message', async (data) => {
    try {
        if (data.messageType === 'image') {
            const imageData = {
                conversationId: data.conversationId,
                messageType: 'image',
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                replyTo: data.replyTo
            };
            const message = await chatService.saveMessage(userId, imageData);
            io.to(`conversation:${data.conversationId}`).emit('chat:new_message', message);
        } else if (data.messageType === 'voice') {
            const voiceData = {
                conversationId: data.conversationId,
                messageType: 'voice',
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                replyTo: data.replyTo
            };
            const message = await chatService.saveMessage(userId, voiceData);
            io.to(`conversation:${data.conversationId}`).emit('chat:new_message', message);
        } else if (data.messageType === 'file') {
            const fileData = {
                conversationId: data.conversationId,
                messageType: 'file',
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                mimeType: data.mimeType,
                replyTo: data.replyTo
            };
            const message = await chatService.saveMessage(userId, fileData);
            io.to(`conversation:${data.conversationId}`).emit('chat:new_message', message);
        } else {
            const message = await chatService.saveMessage(userId, data);
            io.to(`conversation:${data.conversationId}`).emit('chat:new_message', message);
        }
    } catch (error) {
        socket.emit('chat:error', { message: error.message });
    }
});
