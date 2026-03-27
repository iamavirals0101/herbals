import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';
import { ResponsivePie } from '@nivo/pie';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays, subHours } from 'date-fns';
import { FiDownload } from 'react-icons/fi';
import { BarChart2 } from 'lucide-react';
import { useAuth } from '../components/AuthContext';

const COLORS = ['#15803d', '#EF4444', '#F59E0B'];

// Tooltip for campaign analytics charts
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const campaignName = payload[0]?.payload?.name;
    return (
      <div className="bg-white p-2 sm:p-4 rounded-lg shadow-lg border max-w-[200px] sm:max-w-xs text-xs sm:text-sm break-words">
        <p className="font-bold text-blue-700 mb-1 truncate">{campaignName}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="truncate">
            {entry.name}: {entry.value}{entry.unit || ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Preset date range button
const DatePresetButton = ({ label, onClick, active }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
      active
        ? 'bg-blue-100 text-blue-700 border border-blue-200'
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`}
  >
    {label}
  </button>
);

export default function CampaignHistory() {
  const { token } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(new Date());
  const [activePreset, setActivePreset] = useState('30d');

  // Fetch campaign analytics from backend
  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = `${import.meta.env.VITE_API_URL}/analytics/campaigns?startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Error fetching campaign stats');
      }
      const result = await response.json();
      setData(result.stats);
    } catch (err) {
      setError(err.message || 'Error fetching campaign stats');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  // Handle preset date range selection
  const handlePresetClick = (preset) => {
    setActivePreset(preset);
    const now = new Date();
    switch (preset) {
      case '24h':
        setStartDate(subHours(now, 24));
        break;
      case '7d':
        setStartDate(subDays(now, 7));
        break;
      case '30d':
        setStartDate(subDays(now, 30));
        break;
      default:
        break;
    }
    setEndDate(now);
  };

  // Export analytics as CSV (table, charts, pie)
  const handleExportCSV = () => {
    const tableHeaders = ['Campaign', 'Segment', 'Total', 'Sent', 'Failed', 'Pending', 'Success Rate (%)'];
    const tableRows = data.map(row => [
      row.name,
      row.segmentName,
      row.total,
      row.sent,
      row.failed,
      row.pending,
      row.successRate
    ]);
    let csvContent = 'Campaign Analytics Table\n';
    csvContent += tableHeaders.join(',') + '\n';
    csvContent += tableRows.map(r => r.join(',')).join('\n') + '\n\n';
    csvContent += 'Success Rate Over Time (Line Chart)\n';
    csvContent += 'Index,Campaign,Success Rate (%)\n';
    csvContent += data.map((row, i) => `${i + 1},${row.name},${row.successRate}`).join('\n') + '\n\n';
    csvContent += 'Message Status Distribution (Bar Chart)\n';
    csvContent += 'Index,Campaign,Sent,Failed,Pending\n';
    csvContent += data.map((row, i) => `${i + 1},${row.name},${row.sent},${row.failed},${row.pending}`).join('\n') + '\n\n';
    csvContent += 'Overall Message Status (Pie Chart)\n';
    csvContent += 'Status,Count\n';
    csvContent += pieData.map(d => `${d.name},${d.value}`).join('\n') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'campaign_analytics_full.csv';
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  // Aggregate stats for pie chart
  const totalStats = data.reduce((acc, campaign) => ({
    sent: acc.sent + campaign.sent,
    failed: acc.failed + campaign.failed,
    pending: acc.pending + campaign.pending
  }), { sent: 0, failed: 0, pending: 0 });

  const pieData = [
    { name: 'Sent', value: totalStats.sent },
    { name: 'Failed', value: totalStats.failed },
    { name: 'Pending', value: totalStats.pending }
  ];

  // Add index and ensure name/segmentName for chart data
  const dataWithIndex = data.map((campaign, i) => ({
    ...campaign,
    name: campaign.name || '-',
    segmentName: campaign.segmentName || '-',
    index: i + 1
  }));

  return (
    <div id="campaign-dashboard-export" className="p-2 sm:p-4 md:p-8 bg-gray-50 min-h-screen w-full">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 md:mb-8 gap-4 md:gap-4">
          <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-gray-900 flex items-center gap-2"><BarChart2 className="inline-block text-blue-600" size={28} /> Campaign Analytics</h1>
          <div className="flex pt-4 flex-col sm:flex-row gap-2 md:gap-4 relative">
            <button
              onClick={handleExportCSV}
              className="p-2 bg-white border border-gray-300 rounded-full hover:bg-gray-100 transition flex items-center justify-center shadow-sm"
              aria-label="Export as CSV"
              title="Export as CSV"
              style={{ height: 36, width: 36 }}
            >
              <FiDownload className="text-blue-600" size={18} />
            </button>
            <div className="flex gap-2 flex-wrap">
              <DatePresetButton
                label="Last 24 Hours"
                onClick={() => handlePresetClick('24h')}
                active={activePreset === '24h'}
              />
              <DatePresetButton
                label="Last 7 Days"
                onClick={() => handlePresetClick('7d')}
                active={activePreset === '7d'}
              />
              <DatePresetButton
                label="Last 30 Days"
                onClick={() => handlePresetClick('30d')}
                active={activePreset === '30d'}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date);
                    setActivePreset(null);
                  }}
                  maxDate={endDate}
                  slotProps={{ textField: { size: 'small' } }}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(date) => {
                    setEndDate(date);
                    setActivePreset(null);
                  }}
                  minDate={startDate}
                  slotProps={{ textField: { size: 'small' } }}
                />
              </LocalizationProvider>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-2">
          {/* Success Rate Chart */}
          <div className="bg-white p-2 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-4 text-gray-800">Success Rate Over Time</h2>
            <div className="h-[200px] sm:h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dataWithIndex} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="index"
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis unit="%" tick={{ fontSize: 13 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 14, marginTop: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#15803d" 
                    name="Success Rate" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Message Status Distribution Pie Chart */}
          <div className="bg-white p-2 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-1 text-gray-800">Overall Message Status</h2>
            <div className="flex flex-col items-center justify-center" style={{ minHeight: '220px', minWidth: '220px', height: '370px', width: '100%' }}>
              <div style={{ height: '220px', minWidth: '220px', width: '100%' }} className="sm:h-[320px] md:h-[360px]">
                <ResponsivePie
                  data={pieData.map((d, i) => ({
                    id: d.name,
                    label: `${d.name}`,
                    value: d.value,
                    color: COLORS[i % COLORS.length],
                  }))}
                  margin={{ top: 20, right: 10, bottom: 20, left: 10 }}
                  innerRadius={0.7}
                  padAngle={2}
                  cornerRadius={6}
                  colors={COLORS}
                  enableArcLabels={true}
                  arcLabelsSkipAngle={0}
                  arcLabelsRadiusOffset={0.55}
                  arcLabelsTextColor="white"
                  arcLabel={d => d.value > 0 ? `${((d.value / pieData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%` : ''}
                  enableArcLinkLabels={false}
                  tooltip={({ datum }) => (
                    <div className="bg-white p-2 sm:p-3 rounded-lg shadow-lg border text-xs sm:text-sm max-w-[200px] sm:max-w-xs">
                      <span className="font-semibold" style={{ color: datum.color }}>{datum.id}</span>
                      <div className="mt-1">Count: <b>{datum.value}</b></div>
                      <div>Percent: <b>{datum.formattedValue && datum.data.value > 0 ? ((datum.value / pieData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1) : 0}%</b></div>
                    </div>
                  )}
                  legends={[]}
                />
              </div>
              {/* Custom Legend */}
              <div className="flex flex-row justify-center items-center gap-4 sm:gap-8 mt-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ background: COLORS[0], display: 'inline-block' }}></span>
                  <span className="text-sm text-gray-700">Sent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ background: COLORS[1], display: 'inline-block' }}></span>
                  <span className="text-sm text-gray-700">Failed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full" style={{ background: COLORS[2], display: 'inline-block' }}></span>
                  <span className="text-sm text-gray-700">Pending</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sent vs Failed Chart */}
          <div className="bg-white p-2 sm:p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-4 text-gray-800">Message Status Distribution</h2>
            <div className="h-[180px] sm:h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataWithIndex} barCategoryGap={24}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="index"
                    angle={0}
                    textAnchor="middle"
                    height={40}
                    interval={0}
                    tick={{ fontSize: 13, fill: '#666' }}
                  />
                  <YAxis tick={{ fontSize: 13 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 14, marginTop: 8 }}
                  />
                  <Bar dataKey="sent" fill="#15803d" name="Sent" />
                  <Bar dataKey="failed" fill="#EF4444" name="Failed" />
                  <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Campaign Stats Table */}
        <div className="mt-4 sm:mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <div className="p-2 sm:p-4 md:p-6">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-4 text-gray-800">Campaign Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-[10px] sm:text-xs md:text-sm lg:text-base divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                    <th className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Segment</th>
                    <th className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                    <th className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Failed</th>
                    <th className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                    <th className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataWithIndex.map((campaign) => (
                    <tr key={campaign.campaignId} className="hover:bg-gray-50">
                      <td className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-gray-900">{campaign.name}</td>
                      <td className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500">{campaign.segmentName}</td>
                      <td className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500">{campaign.total}</td>
                      <td className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500">{campaign.sent}</td>
                      <td className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500">{campaign.failed}</td>
                      <td className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500">{campaign.pending}</td>
                      <td className="px-1 sm:px-2 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-[10px] sm:text-xs md:text-sm lg:text-base text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          campaign.successRate >= 90 ? 'bg-green-100 text-green-800' :
                          campaign.successRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {campaign.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 