import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Chat {
    chatId: string;
    $id: string;  // Changed from chatId to $id
    participants: string[];
    createdAt: string;
    updatedAt: string;
}

interface ChatContextType {
    currentChat: Chat | null;
    setCurrentChat: (chat: Chat | null) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentChat, setCurrentChat] = useState<Chat | null>(null);

    return (
        <ChatContext.Provider value={{ currentChat, setCurrentChat }}>
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};