import React, { useRef, useState } from 'react';
import { useAuth } from '../components/AuthContext';

const sampleCsv = `name,email,phone,spend,visits,lastOrderDate\nJohn Doe,john@example.com,9876543210,5000,3,2024-05-01\nJane Smith,jane@example.com,9123456789,12000,7,2024-04-15`;

export default function ImportCustomers() {
  const fileInputRef = useRef();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [importResult, setImportResult] = useState(null);
  const { token } = useAuth();

  const handleDownloadSample = () => {
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setUploadMessage('');
    setImportResult(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setImportResult(null);
    if (!selectedFile) {
      setUploadMessage('Please select a CSV file to upload.');
      return;
    }
    setUploadMessage('Uploading...');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/customers/import`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setImportResult(data);
        setUploadMessage(`Imported ${data.importedCount} customers successfully.`);
      } else {
        setUploadMessage(data.message || 'Import failed.');
      }
    } catch (err) {
      setUploadMessage('Failed to upload.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow mt-8">
      <h1 className="text-2xl font-bold mb-4">Import Customers</h1>
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <h2 className="font-bold mb-2">How to Import Customers</h2>
        <ol className="list-decimal pl-6 mb-2">
          <li>Download the <button onClick={handleDownloadSample} className="text-blue-600 underline">sample CSV template</button>.</li>
          <li>Fill in your customer data. <b>Required columns:</b> <span className="font-mono">name, email, phone, spend, visits, lastOrderDate</span>.</li>
          <li>Save your file as <b>CSV</b>.</li>
          <li>Upload your file using the form below.</li>
        </ol>
        <p className="text-sm text-gray-600">Tip: Dates should be in <b>YYYY-MM-DD</b> format.</p>
        <p className="text-sm text-gray-600">
          <b>Excel Users:</b> Before entering dates, select the date column → Right-click → Format Cells → Text. 
          Then enter dates as <b>YYYY-MM-DD</b> (e.g., 2024-05-01).
        </p>
      </div>
      <form onSubmit={handleUpload} className="flex flex-col gap-4">
        <label className="block">
          <span className="font-medium">Select CSV File</span>
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="block mt-2 border border-gray-300 rounded px-3 py-2 w-full"
          />
        </label>
        <button
          type="submit"
          className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 transition"
        >
          Upload
        </button>
        {uploadMessage && <div className="text-blue-700 font-medium mt-2">{uploadMessage}</div>}
      </form>
      {importResult && (
        <div className="mt-6 p-4 bg-green-50 rounded border border-green-200">
          <h3 className="font-bold mb-2">Import Summary</h3>
          <div>Imported: <b>{importResult.importedCount}</b></div>
          {importResult.imported && importResult.imported.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold">Emails Imported:</div>
              <ul className="list-disc pl-6 text-sm">
                {importResult.imported.map(email => <li key={email}>{email}</li>)}
              </ul>
            </div>
          )}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-red-700">Errors:</div>
              <ul className="list-disc pl-6 text-sm text-red-700">
                {importResult.errors.map((err, i) => <li key={i}>Row {err.row}: {err.error}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="mt-6 text-sm text-gray-500">
        <b>FAQ:</b>
        <ul className="list-disc pl-6 mt-2">
          <li>All columns are required. If you don't have a value, leave it blank but keep the column.</li>
          <li>Phone numbers should be digits only.</li>
          <li>If you have trouble, check your CSV formatting or download the sample again.</li>
        </ul>
      </div>
    </div>
  );
} 