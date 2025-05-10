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
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-blue-300">$1</span>');
    
    // Convert bullet points
    formatted = formatted.replace(/- (.*?)(?=\n|$)/g, '<li class="ml-4 mb-2">$1</li>');
    
    // Add paragraph breaks for readability
    formatted = formatted.split('\n').filter(line => line.trim()).map(line => {
      // Don't wrap lines that are already wrapped in HTML tags
      if (line.startsWith('<') && line.endsWith('>')) {
        return line;
      }
      return `<p class="mb-3">${line}</p>`;
    }).join('');
    
    return formatted;
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex justify-between items-start p-4 border-b border-blue-400/30">
        <div className="flex items-center">
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="mr-3 text-blue-400 hover:text-blue-300 transition-colors focus:outline-none"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <svg 
              className={`w-5 h-5 transition-transform duration-300 ${expanded ? 'transform rotate-90' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <h3 className="text-lg font-medium">
            <a 
              href={pr.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 hover:underline transition-colors flex items-center"
            >
              <span className="mr-2 text-xs px-2 py-1 rounded-full border border-blue-500/30 bg-blue-900/20">#{pr.id}</span>
              {pr.description}
            </a>
          </h3>
        </div>
        <div className="flex space-x-2">
          {!isGenerating && !notes && (
            <button
              onClick={generateReleaseNotes}
              className="px-3 py-1 glow-button rounded-full text-sm flex items-center gap-1"
              disabled={isGenerating}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Generate Notes
            </button>
          )}
          {notes && (
            <button
              onClick={generateReleaseNotes}
              className="px-3 py-1 glow-button rounded-full text-sm flex items-center gap-1"
              disabled={isGenerating}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Regenerate
            </button>
          )}
          {notes && (
            <button
              onClick={clearSavedNotes}
              className="px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500/30 text-sm transition-colors flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="p-4">
          {error && (
            <div className="text-red-400 bg-red-900/30 p-4 rounded-lg mb-6 border border-red-500/50">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Error: {error}
              </div>
            </div>
          )}

          {isGenerating && (
            <div className="mt-4">
              <div className="flex items-center mb-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400 mr-3"></div>
                <p className="text-blue-200/80">Generating release notes...</p>
              </div>
              {streamingContent && (
                <div className="notes-container p-4 text-blue-100 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                  {streamingContent}
                </div>
              )}
            </div>
          )}

          {notes && (
            <div className="mt-4 space-y-6">
              <div className="notes-container developer-notes overflow-hidden">
                <div className="px-4 py-2 border-b border-blue-500/30 flex items-center" style={{backgroundColor: 'rgba(59, 130, 246, 0.1)'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-medium text-blue-300">Developer Notes</h4>
                </div>
                <div 
                  className="p-4 prose prose-sm prose-invert max-w-none text-blue-100" 
                  dangerouslySetInnerHTML={{ __html: formatContent(notes.developer) }}
                />
              </div>
              
              <div className="notes-container marketing-notes overflow-hidden">
                <div className="px-4 py-2 border-b border-green-500/30 flex items-center" style={{backgroundColor: 'rgba(16, 185, 129, 0.1)'}}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-medium text-green-300">Marketing Notes</h4>
                </div>
                <div 
                  className="p-4 prose prose-sm prose-invert max-w-none text-green-100"
                  dangerouslySetInnerHTML={{ __html: formatContent(notes.marketing) }}
                />
              </div>
              
              {notes.contributors && notes.contributors !== 'No contributors identified' && (
                <div className="notes-container contributors overflow-hidden">
                  <div className="px-4 py-2 border-b border-purple-500/30 flex items-center" style={{backgroundColor: 'rgba(139, 92, 246, 0.1)'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <h4 className="font-medium text-purple-300">Contributors</h4>
                  </div>
                  <div 
                    className="p-4 prose prose-sm prose-invert max-w-none text-purple-100"
                    dangerouslySetInnerHTML={{ __html: formatContent(notes.contributors) }}
                  />
                </div>
              )}
              
              {notes.relatedIssues && notes.relatedIssues !== 'No related issues identified' && (
                <div className="notes-container related-issues overflow-hidden">
                  <div className="px-4 py-2 border-b border-amber-500/30 flex items-center" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)'}}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <h4 className="font-medium text-amber-300">Related Issues</h4>
                  </div>
                  <div 
                    className="p-4 prose prose-sm prose-invert max-w-none text-amber-100"
                    dangerouslySetInnerHTML={{ __html: formatContent(notes.relatedIssues) }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}