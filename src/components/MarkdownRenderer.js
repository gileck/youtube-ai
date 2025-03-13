import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Paper } from '@mui/material';

/**
 * Custom components for ReactMarkdown with improved styling
 */
const MarkdownComponents = {
    // Add proper indentation for lists
    ul: ({node, ...props}) => (
        <ul style={{paddingLeft: '20px', margin: '8px 0'}} {...props} />
    ),
    // Style list items with proper spacing
    li: ({node, ordered, checked, index, ...props}) => {
        // Check if this is a nested list item by examining parent nodes
        const isNested = node.parent && 
                         node.parent.parent && 
                         (node.parent.parent.type === 'listItem');
        
        return (
            <li style={{
                marginBottom: '4px',
                paddingLeft: isNested ? '8px' : '0px',
            }} {...props} />
        );
    },
    // Improve paragraph spacing
    p: ({node, ...props}) => {
        // Check if this paragraph is inside a list item
        const isInListItem = node.parent && node.parent.type === 'listItem';
        
        return (
            <p style={{
                margin: isInListItem ? '4px 0' : '16px 0',
            }} {...props} />
        );
    },
    // Style headings
    h1: ({node, ...props}) => (
        <h1 style={{
            fontSize: '1.8rem',
            marginTop: '24px',
            marginBottom: '16px',
            fontWeight: 600,
        }} {...props} />
    ),
    h2: ({node, ...props}) => (
        <h2 style={{
            fontSize: '1.5rem',
            marginTop: '20px',
            marginBottom: '12px',
            fontWeight: 600,
        }} {...props} />
    ),
    h3: ({node, ...props}) => (
        <h3 style={{
            fontSize: '1.2rem',
            marginTop: '16px',
            marginBottom: '8px',
            fontWeight: 600,
        }} {...props} />
    ),
    // Style code blocks
    code: ({node, inline, ...props}) => (
        inline ? 
        <code style={{
            backgroundColor: '#f0f0f0',
            padding: '2px 4px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '0.9em',
        }} {...props} /> :
        <code style={{
            display: 'block',
            backgroundColor: '#f5f5f5',
            padding: '12px',
            borderRadius: '4px',
            overflowX: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.9em',
            marginBottom: '16px',
        }} {...props} />
    ),
    // Style blockquotes
    blockquote: ({node, ...props}) => (
        <blockquote style={{
            borderLeft: '4px solid #e0e0e0',
            paddingLeft: '16px',
            margin: '16px 0',
            color: '#616161',
        }} {...props} />
    ),
};

/**
 * MarkdownRenderer component for consistent markdown rendering across the app
 * 
 * @param {Object} props - Component props
 * @param {string} props.content - Markdown content to render
 * @param {Object} props.paperProps - Props to pass to the Paper component
 * @param {boolean} props.noPaper - If true, don't wrap content in Paper
 * @returns {JSX.Element} Rendered markdown
 */
const MarkdownRenderer = ({ content, paperProps = {}, noPaper = false }) => {
    const defaultPaperProps = {
        variant: "outlined",
        sx: { p: 3, bgcolor: '#f9f9f9' },
        ...paperProps
    };

    const markdown = (
        <ReactMarkdown components={MarkdownComponents}>
            {content}
        </ReactMarkdown>
    );
        
    return noPaper ? markdown : (
        <Paper {...defaultPaperProps}>
            {markdown}
        </Paper>
    );
};

export default MarkdownRenderer;
export { MarkdownComponents };
