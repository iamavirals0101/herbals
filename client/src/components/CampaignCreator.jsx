import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '../components/AuthContext';
import { authFetch } from '../utils/authFetch';
import { toast } from 'react-hot-toast';
import { Send, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const CampaignCreator = forwardRef((props, ref) => {
  const { token } = useAuth();
  const location = useLocation();
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [message, setMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);

  // Expose refreshSegments to parent
  useImperativeHandle(ref, () => ({
    refreshSegments: fetchSegments
  }));

  useEffect(() => {
    fetchSegments();
  }, []);

  // If navigated with a segment, pre-select it
  useEffect(() => {
    if (location.state && location.state.segment) {
      const seg = location.state.segment;
      setSelectedSegment(seg.id || seg._id || '');
    }
  }, [location.state]);

  const fetchSegments = async () => {
    try {
      const res = await authFetch(`${API_URL}/segments`, {}, token);
      const data = await res.json();
      setSegments(data.segments || []);
    } catch (err) {
      toast.error('Failed to load segments');
      console.error('Segment fetch error:', err);
    }
  };

  const handleSuggest = async () => {
    if (!selectedSegment) {
      toast.error('Please select a segment first');
      return;
    }

    setLoading(true);
    setSuggestions([]);
    setMessage('');
    setSelectedSuggestion(null);

    try {
      const segment = segments.find(s => s._id === selectedSegment);
      const res = await authFetch(
        `${API_URL}/gemini/suggest`,
        {
          method: 'POST',
          body: JSON.stringify({
            segmentName: segment.name,
            segmentDescription: segment.description
          })
        },
        token
      );
      const data = await res.json();
      setSuggestions(data.suggestions);
    } catch (err) {
      toast.error('Failed to generate suggestions');
      console.error('Suggestion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!campaignName || !message || !selectedSegment) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const res = await authFetch(
        `${API_URL}/campaigns`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: campaignName,
            message,
            segmentId: selectedSegment
          })
        },
        token
      );
      const data = await res.json();
      toast.success(`Campaign sent to ${data.sentTo} customers!`);
      setMessage('');
      setCampaignName('');
      setSelectedSegment('');
      setSuggestions([]);
      setSelectedSuggestion(null);
    } catch (err) {
      toast.error('Failed to send campaign');
      console.error('Campaign error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8 w-full max-w-full sm:max-w-2xl md:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto">
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Create New Campaign</h2>
        {/* Segment Selection */}
        <div className="space-y-1 sm:space-y-2">
          <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700">
            Select Target Segment
          </label>
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="w-full px-2 sm:px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base"
          >
            <option value="">Choose a segment...</option>
            {segments.map(segment => (
              <option key={segment._id} value={segment._id}>
                {segment.name} ({segment.customerCount || 0} customers)
              </option>
            ))}
          </select>
        </div>
        {/* Campaign Name */}
        <div className="space-y-1 sm:space-y-2">
          <label className="block text-xs sm:text-sm md:text-base font-medium text-gray-700">
            Campaign Name
          </label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Enter campaign name..."
            className="w-full px-2 sm:px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base"
          />
        </div>
        {/* AI Suggestions */}
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 md:gap-6">
            <h3 className="text-sm sm:text-base md:text-lg font-medium text-gray-800">Message Content</h3>
            <button
              onClick={handleSuggest}
              disabled={!selectedSegment || loading}
              className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-2 md:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base"
            >
              <Sparkles className="inline-block mr-1" size={18} />
              <span>Get AI Suggestions</span>
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 md:gap-6">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setMessage(suggestion.message);
                    setSelectedSuggestion(index);
                  }}
                  className={`p-2 sm:p-4 md:p-6 border rounded-lg text-left transition-all text-xs sm:text-sm md:text-base ${
                    selectedSuggestion === index
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <p className="font-medium text-gray-800 text-xs sm:text-sm md:text-base">{suggestion.message}</p>
                  {suggestion.explanation && (
                    <p className="mt-2 text-xs sm:text-sm md:text-base text-gray-600">{suggestion.explanation}</p>
                  )}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your campaign message..."
            rows={4}
            className="w-full px-2 sm:px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base"
          />
        </div>
        {/* Send Button */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4 mt-2">
          <button
            onClick={handleSend}
            disabled={!message || !selectedSegment || !campaignName || loading}
            className="w-full sm:w-auto px-3 sm:px-4 md:px-6 py-2 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="inline-block mr-1" size={18} />
                <span>Send Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});

export default CampaignCreator; 