import { useState, useEffect } from 'react';

interface DiffItem {
  id: string;
  description: string;
  diff: string;
  url: string;
}

interface PullRequestItemProps {
  pr: DiffItem;
}

interface ReleaseNotes {
  developer: string;
  marketing: string;
  contributors?: string;
  relatedIssues?: string;
}

export default function PullRequestItem({ pr }: PullRequestItemProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState<ReleaseNotes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [expanded, setExpanded] = useState(true);

  // Load saved notes from localStorage on component mount
  useEffect(() => {
    const savedNotes = localStorage.getItem(`notes-${pr.id}`);
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Failed to parse saved notes:', e);
      }
    }
  }, [pr.id]);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    if (notes) {
      localStorage.setItem(`notes-${pr.id}`, JSON.stringify(notes));
    }
  }, [notes, pr.id]);

  const generateReleaseNotes = async () => {
    setIsGenerating(true);
    setError(null);
    setStreamingContent('');
    setNotes(null);
    setExpanded(true);
    
    try {
      const response = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diff: pr.diff,
          prTitle: pr.description,
          prId: pr.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate release notes');
      }

      if (!response.body) {
        throw new Error('Response body is empty');
      }

      // Process the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              // Stream is complete
              break;
            }
            
            try {
              const parsedData = JSON.parse(data);
              if (parsedData.content) {
                fullContent += parsedData.content;
                setStreamingContent(fullContent);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      // Process the full content to extract all sections
      let developerNotes = '';
      let marketingNotes = '';
      let contributors = '';
      let relatedIssues = '';
      
      // Extract developer notes
      const developerMatch = fullContent.match(/DEVELOPER_NOTES:\s*([\s\S]*?)(?=\s*MARKETING_NOTES:|CONTRIBUTORS:|RELATED_ISSUES:|$)/i);
      if (developerMatch && developerMatch[1]) {
        developerNotes = developerMatch[1].trim();
      }
      
      // Extract marketing notes
      const marketingMatch = fullContent.match(/MARKETING_NOTES:\s*([\s\S]*?)(?=\s*CONTRIBUTORS:|RELATED_ISSUES:|$)/i);
      if (marketingMatch && marketingMatch[1]) {
        marketingNotes = marketingMatch[1].trim();
      }
      
      // Extract contributors
      const contributorsMatch = fullContent.match(/CONTRIBUTORS:\s*([\s\S]*?)(?=\s*RELATED_ISSUES:|$)/i);
      if (contributorsMatch && contributorsMatch[1]) {
        contributors = contributorsMatch[1].trim();
      }
      
      // Extract related issues
      const relatedIssuesMatch = fullContent.match(/RELATED_ISSUES:\s*([\s\S]*?)(?=$)/i);
      if (relatedIssuesMatch && relatedIssuesMatch[1]) {
        relatedIssues = relatedIssuesMatch[1].trim();
      }
      
      const newNotes = {
        developer: developerNotes || 'No developer notes generated',
        marketing: marketingNotes || 'No marketing notes generated',
        contributors: contributors || 'No contributors identified',
        relatedIssues: relatedIssues || 'No related issues identified',
      };

      setNotes(newNotes);
      // Save to localStorage 
      localStorage.setItem(`notes-${pr.id}`, JSON.stringify(newNotes));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearSavedNotes = () => {
    localStorage.removeItem(`notes-${pr.id}`);
    setNotes(null);
  };

  // Format content to replace markdown-style elements with HTML
  const formatContent = (content: string) => {
    if (!content) return content;
    
    // Replace bold markdown (**text**) with styled spans
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-blue-700 dark:text-blue-400">$1</span>');
    
    // Convert bullet points
    formatted = formatted.replace(/- (.*?)(?=\n|$)/g, '<li class="ml-4">$1</li>');
    
    // Add paragraph breaks for readability
    formatted = formatted.split('\n').filter(line => line.trim()).map(line => {
      // Don't wrap lines that are already wrapped in HTML tags
      if (line.startsWith('<') && line.endsWith('>')) {
        return line;
      }
      return `<p class="mb-2">${line}</p>`;
    }).join('');
    
    return formatted;
  };

  return (
    <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 mb-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="mr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <svg 
              className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'transform rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h3 className="text-lg font-semibold">
            <a 
              href={pr.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              PR #{pr.id}: {pr.description}
            </a>
          </h3>
        </div>
        <div className="flex space-x-2">
          {!isGenerating && !notes && (
            <button
              onClick={generateReleaseNotes}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm shadow-sm"
              disabled={isGenerating}
            >
              Generate Notes
            </button>
          )}
          {notes && (
            <button
              onClick={generateReleaseNotes}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm shadow-sm"
              disabled={isGenerating}
            >
              Regenerate
            </button>
          )}
          {notes && (
            <button
              onClick={clearSavedNotes}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm shadow-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          {error && (
            <div className="text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded mb-4 shadow-sm">
              Error: {error}
            </div>
          )}

          {isGenerating && (
            <div className="mt-4">
              <div className="flex items-center mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <p className="text-gray-600 dark:text-gray-400">Generating release notes...</p>
              </div>
              {streamingContent && (
                <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded border border-gray-300 dark:border-gray-700 whitespace-pre-wrap font-mono text-sm shadow-inner">
                  {streamingContent}
                </div>
              )}
            </div>
          )}

          {notes && (
            <div className="mt-4 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300">Developer Notes</h4>
                </div>
                <div 
                  className="p-4 prose prose-sm dark:prose-invert max-w-none" 
                  dangerouslySetInnerHTML={{ __html: formatContent(notes.developer) }}
                />
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                  <h4 className="font-medium text-green-800 dark:text-green-300">Marketing Notes</h4>
                </div>
                <div 
                  className="p-4 prose prose-sm dark:prose-invert max-w-none" 
                  dangerouslySetInnerHTML={{ __html: formatContent(notes.marketing) }}
                />
              </div>
              
              {notes.contributors && notes.contributors !== 'No contributors identified' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="bg-purple-50 dark:bg-purple-900/20 px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                    <h4 className="font-medium text-purple-800 dark:text-purple-300">Contributors</h4>
                  </div>
                  <div 
                    className="p-4 prose prose-sm dark:prose-invert max-w-none" 
                    dangerouslySetInnerHTML={{ __html: formatContent(notes.contributors) }}
                  />
                </div>
              )}
              
              {notes.relatedIssues && notes.relatedIssues !== 'No related issues identified' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                    <h4 className="font-medium text-amber-800 dark:text-amber-300">Related Issues</h4>
                  </div>
                  <div 
                    className="p-4 prose prose-sm dark:prose-invert max-w-none" 
                    dangerouslySetInnerHTML={{ __html: formatContent(notes.relatedIssues) }}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}