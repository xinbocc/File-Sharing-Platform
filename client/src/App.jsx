import { useState } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareId, setShareId] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('');
    setShareLink('');
    setShareId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setStatus('⚠️ Please select a file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      setStatus('🔄 Generating share link...');
      
      const response = await fetch('/send', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setShareLink(data.shareLink);
        setShareId(data.shareId);
        setStatus('✅ Share link generated successfully!');
      } else {
        setStatus(`❌ Error: ${data.error || 'Unknown error.'}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ Failed to generate share link.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setStatus('📋 Link copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setStatus('📋 Link copied to clipboard!');
    }
  };

  const resetForm = () => {
    setFile(null);
    setShareLink('');
    setShareId('');
    setStatus('');
    document.getElementById('fileInput').value = '';
  };

  return (
    <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
      <div className="bg-yellow-100 p-8 rounded-lg shadow-lg w-full max-w-lg border-4 border-purple-800">
        <h1 className="text-2xl font-bold mb-6 text-center">🔐 P2P File Share</h1>
        
        {!shareLink ? (
          // Upload Form
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="font-medium text-sm block mb-2">📁 Choose File:</label>
              <input
                id="fileInput"
                type="file"
                onChange={handleFileChange}
                className="w-full bg-white p-2 border border-gray-300 rounded"
                accept="*/*"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !file}
              className="bg-purple-700 text-white py-3 px-4 rounded hover:bg-purple-800 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '🔄 Generating...' : '🔗 Generate Share Link'}
            </button>
          </form>
        ) : (
          // Share Link Result
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 rounded p-4">
              <h3 className="font-bold text-green-800 mb-2">✅ Share Link Generated!</h3>
              <p className="text-sm text-green-700">
                Share this link with anyone you want to send the file to:
              </p>
            </div>
            
            <div className="bg-white border border-gray-300 rounded p-3">
              <label className="font-medium text-xs text-gray-600 block mb-1">Share Link:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 bg-gray-50 p-2 text-sm border border-gray-200 rounded"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm"
                >
                  📋 Copy
                </button>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <h4 className="font-medium text-blue-800 mb-2">📋 How it works:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Share the link with anyone you want to send the file to</li>
                <li>• When they click the link, the file will be encrypted and transferred</li>
                <li>• The download will start automatically</li>
                <li>• Your file stays secure with P2P encryption</li>
              </ul>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={resetForm}
                className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
              >
                📤 Share Another File
              </button>
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 text-center"
              >
                🧪 Test Download
              </a>
            </div>
          </div>
        )}

        {status && (
          <div className="mt-4 p-3 bg-gray-100 border border-gray-300 rounded">
            <div className="text-center text-sm text-gray-800">
              {status}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;