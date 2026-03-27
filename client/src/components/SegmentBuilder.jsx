// client/src/components/SegmentBuilder.jsx
import React, { useState, useEffect } from 'react';
import { QueryBuilder, formatQuery } from 'react-querybuilder';
import 'react-querybuilder/dist/query-builder.css';
import { useAuth } from '../components/AuthContext';
import { authFetch } from '../utils/authFetch';
import { Eye, Save, Target, AlertTriangle, Check, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// API base URL (set by environment or fallback to localhost)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Operator label map for user-friendly text
const operatorMap = {
  '>': 'is greater than',
  '<': 'is less than',
  '=': 'is equal to',
  '>=': 'is greater than or equal to',
  '<=': 'is less than or equal to',
  '!=': 'is not equal to'
};

const operatorObjects = Object.entries(operatorMap).map(([name, label]) => ({ name, label }));

// Field definitions for the segment builder UI
const fields = [
  { 
    name: 'spend', 
    label: 'Total Spend (₹)', 
    inputType: 'number',
    operators: operatorObjects,
    defaultValue: 1000,
    validator: ({ value }) => {
      const n = Number(value);
      return !isNaN(n) && isFinite(n) && n >= 0;
    },
    tooltip: 'Total amount spent by customer in Indian Rupees'
  },
  { 
    name: 'visits', 
    label: 'Number of Visits', 
    inputType: 'number',
    operators: operatorObjects,
    defaultValue: 1,
    validator: ({ value }) => {
      const n = Number(value);
      return !isNaN(n) && isFinite(n) && Number.isInteger(n) && n >= 0;
    },
    tooltip: 'Total number of times the customer visited your store/website'
  },
  { 
    name: 'inactiveDays', 
    label: 'Days Since Last Order', 
    inputType: 'number',
    operators: operatorObjects,
    defaultValue: 30,
    validator: ({ value }) => {
      const n = Number(value);
      return !isNaN(n) && isFinite(n) && Number.isInteger(n) && n >= 0;
    },
    tooltip: 'Number of days since the customer last placed an order'
  },
];

export default function SegmentBuilder({ onSave }) {
  const { token } = useAuth();
  const [query, setQuery] = useState({
    combinator: 'and', 
    rules: [
      { field: 'spend', operator: '>', value: 1000 }
    ]
  });
  const [segmentName, setSegmentName] = useState('');
  const [previewCount, setPreviewCount] = useState(null);
  const [previewResults, setPreviewResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [savedSegments, setSavedSegments] = useState([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [nlInput, setNlInput] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState('');
  const [showSegments, setShowSegments] = useState(false);
  const [previewedSegmentId, setPreviewedSegmentId] = useState(null);
  const [segmentPreview, setSegmentPreview] = useState({});
  const [segmentPreviewLoading, setSegmentPreviewLoading] = useState(false);
  const [segmentPreviewError, setSegmentPreviewError] = useState('');
  const [showSampleCustomers, setShowSampleCustomers] = useState(false);
  const navigate = useNavigate();

  // Ensure new rules have proper default values
  const createRule = (field) => {
    const fieldDef = fields.find(f => f.name === field) || fields[0];
    return {
      field: fieldDef.name,
      operator: fieldDef.operators[0].name,
      value: fieldDef.defaultValue || ''
    };
  };

  // Ensure all operators are strings before sending to backend
  const sanitizeQuery = (q) => {
    function sanitizeNode(node) {
      if (node.rules) {
        return {
          ...node,
          rules: node.rules.map(sanitizeNode),
        };
      } else {
        return {
          ...node,
          operator: typeof node.operator === 'object' ? node.operator.name : node.operator
        };
      }
    }
    return sanitizeNode(q);
  };

  // Validate query whenever it changes
  useEffect(() => {
    validateQuery();
  }, [query]);

  // Validate query structure and values
  const validateQuery = () => {
    const errors = [];
    const hasCompleteRule = query.rules.some(rule => 
      rule.field && rule.operator && rule.value !== undefined && rule.value !== ''
    );
    if (!hasCompleteRule) {
      errors.push('Please complete at least one rule');
    }
    query.rules.forEach((rule, index) => {
      if (!rule.rules) {
        const field = fields.find(f => f.name === rule.field);
        if (field?.validator && rule.value !== undefined && rule.value !== '') {
          const isValid = field.validator(rule);
          if (!isValid) {
            errors.push(`Invalid value for ${field.label} in rule #${index + 1}`);
          }
        }
      }
    });
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Preview segment results from backend
  const handlePreview = async () => {
    if (!validateQuery()) {
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE_URL}/segments/preview`,
        {
          method: 'POST',
          body: JSON.stringify({ rules: sanitizeQuery(query) })
        },
        token
      );
      const data = await res.json();
      setPreviewCount(data.count);
      setPreviewResults(data.sample || []);
    } catch (err) {
      setError('Failed to preview segment');
    } finally {
      setLoading(false);
    }
  };

  // Save segment to backend
  const handleSave = async () => {
    if (!validateQuery()) {
      return;
    }
    if (!segmentName.trim()) {
      setError('Please provide a name for this segment');
      return;
    }
    setLoading(true);
    setError('');
    // Debug log for token
    console.log('[DEBUG] Token used for save segment:', token);
    try {
      const res = await authFetch(
        `${API_BASE_URL}/segments`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: segmentName,
            rules: sanitizeQuery(query)
          })
        },
        token
      );
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setSavedSegments(prev => [data.segment, ...prev]);
        if (onSave) {
          onSave(data.segment);
        }
        setSegmentName('');
      } else {
        setError(data.message || 'Failed to save segment');
      }
    } catch (err) {
      setError('Failed to save segment');
    } finally {
      setLoading(false);
    }
  };

  const handleNLToRules = async () => {
    if (!nlInput.trim()) return;
    setNlLoading(true);
    setNlError('');
    try {
      const res = await authFetch(
        `${API_BASE_URL}/gemini/nl-to-rules`,
        {
          method: 'POST',
          body: JSON.stringify({ description: nlInput })
        },
        token
      );
      const data = await res.json();
      if (data.success && data.rules) {
        setQuery(data.rules);
        setNlInput('');
      } else {
        setNlError(data.message || 'Could not convert description to rules.');
      }
    } catch (err) {
      setNlError('Failed to convert description to rules.');
    } finally {
      setNlLoading(false);
    }
  };

  // Custom rendering for the operator selector to make it more intuitive
  const OperatorSelector = (props) => {
    const currentValue = typeof props.value === 'object' ? props.value.name : (props.value || '>');
    return (
      <div className="inline-block min-w-[120px] w-full sm:w-auto">
        <select
          value={currentValue}
          onChange={e => props.handleOnChange(e.target.value)}
          className="border px-2 py-1 rounded bg-white min-w-[120px] w-full sm:w-auto block"
          style={{appearance: 'menulist'}}
        >
          {props.options.map(option => (
            <option key={option.name} value={option.name}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };


// Simple, reliable value editor for text and number inputs
const ValueEditor = (props) => {
  const field = fields.find(f => f.name === props.field);
  const inputType = field?.inputType || 'text';
  const isNumber = inputType === 'number';

  return (
    <input
      type="text"  // Using text type for all inputs for consistent behavior
      value={props.value === undefined || props.value === null ? '' : props.value}
      onChange={(e) => props.handleOnChange(e.target.value)}
      className="border px-2 py-1 rounded bg-white ml-1 w-full sm:w-25 block"
      placeholder={field?.defaultValue ?? ''}
      autoComplete="off"
      // Use inputMode for mobile keyboard hints without the browser behaviors of type="number"
      inputMode={isNumber ? 'numeric' : undefined}
      // Let validation happen at the parent level instead of in this component
    />
  );
};
  // Custom rendering for field selector with tooltips and better labels
  const FieldSelector = (props) => {
    const fieldOptions = props.options || [];
    return (
      <div className="relative inline-block w-full sm:w-auto">
        <select
          value={props.value}
          onChange={e => props.handleOnChange(e.target.value)}
          className="border px-2 py-1 rounded bg-white w-full sm:w-auto block"
        >
          {fieldOptions.map(option => (
            <option key={option.name} value={option.name}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Function to display human-readable explanation of the segment
  const getSegmentExplanation = (rulesObj = query) => {
    const explainRule = (rule) => {
      if (rule.rules) {
        // This is a group
        const childExplanations = rule.rules.map(explainRule);
        const combinator = rule.combinator === 'and' ? 'ALL' : 'ANY';
        return `(${combinator} of: ${childExplanations.join(', ')})`;
      } else {
        // This is a rule
        const field = fields.find(f => f.name === rule.field);
        const fieldLabel = field ? field.label : rule.field;
        const operatorMap = {
          '>': 'is greater than',
          '<': 'is less than',
          '=': 'is equal to',
          '>=': 'is greater than or equal to',
          '<=': 'is less than or equal to',
          '!=': 'is not equal to'
        };
        const operatorText = operatorMap[rule.operator] || rule.operator;
        return `${fieldLabel} ${operatorText} ${rule.value}`;
      }
    };

    const mainCombinator = rulesObj.combinator === 'and' ? 'ALL' : 'ANY';
    const ruleExplanations = rulesObj.rules.map(explainRule);
    
    return `Customers who match ${mainCombinator} of these conditions: ${ruleExplanations.join(', ')}`;
  };

  // Add delete handler
  const handleDeleteSegment = async (segmentId) => {
    if (!window.confirm('Are you sure you want to delete this segment?')) return;
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(
        `${API_BASE_URL}/segments/${segmentId}`,
        { method: 'DELETE' },
        token
      );
      const data = await res.json();
      if (data.success) {
        setSavedSegments(prev => prev.filter(seg => seg.id !== segmentId));
      } else {
        setError(data.message || 'Failed to delete segment');
      }
    } catch (err) {
      setError('Failed to delete segment');
    } finally {
      setLoading(false);
    }
  };

  // Fetch preview for a saved segment
  const handlePreviewSavedSegment = async (segment) => {
    setPreviewedSegmentId(segment.id || segment._id);
    setSegmentPreviewLoading(true);
    setSegmentPreviewError('');
    setSegmentPreview({});
    try {
      const res = await authFetch(
        `${API_BASE_URL}/segments/preview`,
        {
          method: 'POST',
          body: JSON.stringify({ rules: segment.rules })
        },
        token
      );
      const data = await res.json();
      if (data.success) {
        setSegmentPreview(data);
      } else {
        setSegmentPreviewError(data.message || 'Failed to preview segment');
      }
    } catch (err) {
      setSegmentPreviewError('Failed to preview segment');
    } finally {
      setSegmentPreviewLoading(false);
    }
  };

  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const res = await authFetch(`${API_BASE_URL}/segments`, {}, token);
        const data = await res.json();
        if (data.success && data.segments) {
          setSavedSegments(data.segments);
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchSegments();
  }, [token]);

  return (
    <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl mx-auto p-2 sm:p-4 md:p-6 lg:p-8 bg-white rounded-2xl shadow-lg relative">
      {/* Top bar with title and show saved segments button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-lg sm:text-xl font-semibold">Define Audience Segment</h2>
        <button
          onClick={() => setShowSegments(!showSegments)}
          className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-blue-500 text-blue-700 font-semibold rounded-lg bg-white hover:bg-blue-50 transition shadow-sm ${showSegments ? 'bg-blue-50 border-blue-700' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          {showSegments ? 'Hide Saved Segments' : 'Show Saved Segments'}
        </button>
      </div>
      
      {showHelp && (
        <div className="mb-6 p-2 sm:p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-semibold text-blue-800 mb-2 text-xs sm:text-sm md:text-base">How to use the Segment Builder</h3>
          <ul className="list-disc pl-4 sm:pl-5 text-xs sm:text-sm md:text-base text-blue-800 space-y-2">
            <li>Use <strong>Add Rule</strong> to create conditions for your segment</li>
            <li>Use <strong>Add Group</strong> to create nested conditions with their own AND/OR logic</li>
            <li>AND means customers must match all conditions</li>
            <li>OR means customers must match at least one condition</li>
            <li>Click <strong>Preview Audience</strong> to see how many customers match your criteria</li>
          </ul>
        </div>
      )}
      
      <div className="mb-4">
        <label htmlFor="segmentName" className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 mb-1">
          Segment Name
        </label>
        <input
          type="text"
          id="segmentName"
          value={segmentName}
          onChange={(e) => setSegmentName(e.target.value)}
          placeholder="E.g., High Value Customers"
          className="w-full px-2 sm:px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base"
        />
      </div>

      {/* NL to Rules UI */}
      <div className="mb-4">
        <label htmlFor="nlInput" className="block text-xs sm:text-sm md:text-base font-medium text-gray-700 mb-1">
          Or describe your segment in plain English
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            id="nlInput"
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            placeholder="E.g., People who haven't shopped in 6 months and spent over ₹5K"
            className="flex-1 px-2 sm:px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm md:text-base"
            disabled={nlLoading}
          />
          <button
            onClick={handleNLToRules}
            disabled={nlLoading || !nlInput.trim()}
            className={`px-4 py-2 rounded-md text-white text-xs sm:text-sm md:text-base ${nlLoading || !nlInput.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
          >
            {nlLoading ? 'Converting...' : 'Convert to Rules'}
          </button>
        </div>
        {nlError && <div className="mt-2 text-xs text-red-600">{nlError}</div>}
      </div>
      
      <div className="bg-gray-50 p-2 sm:p-4 md:p-6 rounded-lg mb-4 border border-gray-200 overflow-x-auto">
        <div className="mb-2 text-xs sm:text-sm text-gray-600">
          <strong>Current Logic:</strong> {getSegmentExplanation()}
        </div>
        
        <div className="min-w-[280px] sm:min-w-[340px] w-full text-xs sm:text-sm md:text-base">
          <QueryBuilder
            fields={fields}
            query={query}
            onQueryChange={q => setQuery(sanitizeQuery(q))}
            controlClassnames={{
              queryBuilder: 'p-2 sm:p-4 md:p-6',
              ruleGroup: 'bg-blue-100 p-4 rounded-xl border border-blue-200 my-2',
              rule: 'flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-3',
              value: 'border px-2 py-1 rounded bg-white w-full sm:w-auto',
              addGroup: 'bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4 py-1 md:py-2 rounded border border-blue-200 ml-0 sm:ml-2 w-full sm:w-auto',
              addRule: 'bg-green-50 text-green-600 hover:bg-green-100 text-xs sm:text-sm md:text-base px-2 sm:px-3 md:px-4 py-1 md:py-2 rounded border border-green-200 ml-0 sm:ml-2 w-full sm:w-auto',
              removeGroup: 'text-red-500 hover:text-red-700 ml-0 sm:ml-2',
              removeRule: '',
              combinators: 'border px-3 py-1 rounded bg-white font-medium ml-0 sm:ml-2 w-full sm:w-auto',
              fields: 'border px-2 py-1 rounded bg-white w-full sm:w-auto',
              operators: 'border px-2 py-1 rounded bg-white ml-0 sm:ml-2 min-w-[120px] w-full sm:w-auto',
              valueContainer: 'ml-0 sm:ml-2 flex-grow',
            }}
            translations={{
              addGroup: '+ Add Group',
              addRule: '+ Add Rule',
              removeGroup: '×',
              removeRule: '',
              combinators: {
                and: 'ALL of the following',
                or: 'ANY of the following'
              }
            }}
            showNotToggle={false}
            showCloneButtons={false}
            controlElements={{
              operatorSelector: OperatorSelector,
              fieldSelector: FieldSelector,
              valueEditor: ValueEditor,
              combinatorSelector: props => (
                <div className="inline-flex items-center w-full sm:w-auto">
                  <span className="mr-2 text-xs sm:text-sm font-medium">Match</span>
                  <select
                    value={props.value}
                    onChange={e => props.handleOnChange(e.target.value)}
                    className="border px-3 py-1 rounded bg-white font-medium w-full sm:w-auto"
                  >
                    <option value="and">ALL of the following</option>
                    <option value="or">ANY of the following</option>
                  </select>
                </div>
              ),
              removeRuleAction: (props) => (
                <button
                  type="button"
                  onClick={props.handleOnClick}
                  className="ml-2 p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 transition flex items-center justify-center shadow-sm border border-red-200"
                  title="Delete Rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ),
            }}
            createRule={createRule}
          />
        </div>
      </div>
      
      {validationErrors.length > 0 && (
        <div className="mb-4 p-2 sm:p-3 md:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="font-medium text-yellow-800 text-xs sm:text-sm md:text-base">Please fix the following issues:</p>
          <ul className="mt-1 list-disc pl-4 sm:pl-5 text-xs sm:text-sm md:text-base text-yellow-700">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row md:flex-row items-stretch sm:items-center md:items-center space-y-2 sm:space-y-0 md:space-y-0 sm:space-x-4 md:space-x-6 mt-6">
        <button
          onClick={handlePreview}
          disabled={loading || validationErrors.length > 0}
          className={`w-full sm:w-auto md:w-auto px-4 sm:px-5 md:px-6 py-2 md:py-3 rounded-xl text-white flex items-center justify-center text-xs sm:text-base md:text-lg ${
            loading || validationErrors.length > 0 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Previewing...
            </>
          ) : (
            <>
              <Eye className="inline-block mr-1" size={18} />
              Preview Audience
            </>
          )}
        </button>
        <button
          onClick={handleSave}
          disabled={validationErrors.length > 0 || !segmentName.trim()}
          className={`w-full sm:w-auto md:w-auto px-4 sm:px-5 md:px-6 py-2 md:py-3 rounded-xl text-white text-xs sm:text-base md:text-lg ${
            validationErrors.length > 0 || !segmentName.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          <Save className="inline-block mr-1" size={18} />
          Save Segment
        </button>
      </div>

      {previewCount !== null && !loading && (
        <div className="mt-6 space-y-4">
          <div className="p-2 sm:p-3 md:p-4 bg-blue-50 rounded-lg text-blue-800 border border-blue-100">
            <div className="flex flex-col sm:flex-row md:flex-row items-start sm:items-center md:items-center gap-2 md:gap-4">
              <Target className="text-blue-600 mr-2" size={28} />
              <div>
                <p className="font-medium text-xs sm:text-base md:text-lg">Matched customers: <strong>{previewCount.toLocaleString()}</strong></p>
                <p className="text-xs sm:text-sm md:text-base mt-1">{getSegmentExplanation()}</p>
              </div>
            </div>
          </div>
          
          {previewResults.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <button
                className="flex items-center gap-2 px-4 py-2 w-full text-left text-xs sm:text-base md:text-lg font-medium bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition"
                onClick={() => setShowSampleCustomers(v => !v)}
                aria-expanded={showSampleCustomers}
              >
                <span>Sample Customers ({previewResults.length})</span>
                {showSampleCustomers ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                <span className="text-xs text-gray-500 ml-2">Showing a sample of matching customers</span>
              </button>
              {showSampleCustomers && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm md:text-base">
                    <thead className="bg-gray-50">
                      <tr>
                        {Object.keys(previewResults[0]).map(key => (
                          <th 
                            key={key}
                            className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-xs sm:text-sm md:text-base font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewResults.map((customer, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {Object.values(customer).map((val, j) => (
                            <td key={j} className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm md:text-base text-gray-500">
                              {typeof val === 'object' && val instanceof Date 
                                ? val.toLocaleString() 
                                : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-2 sm:p-3 md:p-4 bg-red-50 rounded-lg text-red-800 border border-red-200 text-xs sm:text-sm md:text-base">
          <AlertTriangle className="inline-block mr-1 text-yellow-600" size={18} />
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white text-green-700 px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 rounded-lg shadow-lg flex items-center space-x-2 border border-green-200 z-50 animate-fade-in text-xs sm:text-base md:text-lg">
          <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          <span className="font-medium">Segment saved successfully!</span>
        </div>
      )}

      {showSegments && (
        <div className="mt-6">
          <h3 className="text-base sm:text-lg md:text-xl font-medium mb-3">Saved Segments</h3>
          {savedSegments.length === 0 ? (
            <div className="p-4 text-gray-500 text-center bg-gray-50 rounded-lg border border-gray-100">No saved segments yet.</div>
          ) : (
            <div className="space-y-3">
              {savedSegments.map(segment => (
                <div
                  key={segment.id || segment._id}
                  className="bg-white hover:bg-gray-100 transition-colors p-2 sm:p-3 md:p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer"
                  onClick={() => navigate('/campaigns', { state: { segment } })}
                  style={{ transition: 'background 0.2s' }}
                >
                  <div>
                    <h4 className="font-medium text-base sm:text-lg md:text-xl">{segment.name}</h4>
                    <span className="text-xs sm:text-sm md:text-base text-gray-500">
                      {segment.customerCount?.toLocaleString?.() ?? 0} customers
                    </span>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">
                      {getSegmentExplanation(segment.rules)}
                    </p>
                    <p className="text-xs sm:text-sm md:text-base text-gray-400 mt-2">
                      Created {typeof segment.createdAt === 'string' ? new Date(segment.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      setLoading(true);
                      setError('');
                      try {
                        const res = await authFetch(
                          `${API_BASE_URL}/segments/${segment.id || segment._id}`,
                          { method: 'DELETE' },
                          token
                        );
                        const data = await res.json();
                        if (data.success) {
                          setSavedSegments(prev => prev.filter(seg => (seg.id || seg._id) !== (segment.id || segment._id)));
                        } else {
                          setError(data.message || 'Failed to delete segment');
                        }
                      } catch (err) {
                        setError('Failed to delete segment');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="ml-0 sm:ml-4 mt-2 sm:mt-0 px-4 py-2 rounded-full bg-red-50 text-red-700 flex items-center text-xs font-semibold border border-red-200 hover:bg-red-100 transition shadow-sm"
                    title="Delete Segment"
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}