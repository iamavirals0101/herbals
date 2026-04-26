import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { authFetch } from '../utils/authFetch';
import { toast } from 'react-hot-toast';
import { BarChart3, FlaskConical, Trophy } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const emptyStats = {
  A: { total: 0, sent: 0, failed: 0, pending: 0, opened: 0, clicked: 0, conversions: 0, openRate: 0, clickRate: 0, conversionRate: 0 },
  B: { total: 0, sent: 0, failed: 0, pending: 0, opened: 0, clicked: 0, conversions: 0, openRate: 0, clickRate: 0, conversionRate: 0 }
};

export default function CampaignComparator() {
  const { token } = useAuth();
  const [segments, setSegments] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [stats, setStats] = useState(emptyStats);
  const [winner, setWinner] = useState(null);
  const [winnerBasis, setWinnerBasis] = useState('clicks');

  const [form, setForm] = useState({
    name: '',
    segmentId: '',
    variantA: '',
    variantB: '',
    splitRatio: 50,
    landingUrl: ''
  });

  const selectedCampaign = useMemo(
    // Memoized lookup keeps campaign selection stable while stats refreshes run.
    () => campaigns.find((c) => String(c._id || c.id) === String(selectedCampaignId)),
    [campaigns, selectedCampaignId]
  );

  async function loadSegments() {
    try {
      const res = await authFetch(`${API_URL}/segments`, {}, token);
      const data = await res.json();
      if (data.success) {
        setSegments(data.segments || []);
      }
    } catch (err) {
      toast.error('Failed to load segments');
    }
  }

  async function loadCampaigns() {
    try {
      const res = await authFetch(`${API_URL}/comparator/campaigns`, {}, token);
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      toast.error('Failed to load comparator campaigns');
    }
  }

  async function loadStats(campaignId) {
    if (!campaignId) {
      setStats(emptyStats);
      setWinner(null);
      return;
    }

    setStatsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/comparator/campaigns/${campaignId}/stats`, {}, token);
      const data = await res.json();
      if (data.success) {
        setStats({
          A: data.byVariant?.A || emptyStats.A,
          B: data.byVariant?.B || emptyStats.B
        });
        setWinner(data.winner || null);
        setWinnerBasis(data.winnerBasis || 'clicks');
      } else {
        toast.error(data.message || 'Failed to load campaign stats');
      }
    } catch (err) {
      toast.error('Failed to load campaign stats');
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    loadSegments();
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) {
      loadStats(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  async function handleLaunch(e) {
    e.preventDefault();
    if (!form.name || !form.segmentId || !form.variantA || !form.variantB) {
      toast.error('Please complete all required fields');
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(
        `${API_URL}/comparator/launch`,
        {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            splitRatio: Number(form.splitRatio)
          })
        },
        token
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Launch failed');
      }

      toast.success(`Comparator launched for ${data.sentTo} customers`);
      setForm({ name: '', segmentId: '', variantA: '', variantB: '', splitRatio: 50, landingUrl: '' });
      await loadCampaigns();
      if (data.campaignId) {
        setSelectedCampaignId(String(data.campaignId));
      }
    } catch (err) {
      toast.error(err.message || 'Comparator launch failed');
    } finally {
      setLoading(false);
    }
  }

  const metricRows = [
    { label: 'Total Audience', key: 'total' },
    { label: 'Sent', key: 'sent' },
    { label: 'Failed', key: 'failed' },
    { label: 'Pending', key: 'pending' },
    { label: 'Opened', key: 'opened' },
    { label: 'Clicked', key: 'clicked' },
    { label: 'Conversions', key: 'conversions' },
    { label: 'Open Rate', key: 'openRate', suffix: '%' },
    { label: 'Click Rate', key: 'clickRate', suffix: '%' },
    { label: 'Conversion Rate', key: 'conversionRate', suffix: '%' }
  ];

  return (
    <div className="p-2 sm:p-4 md:p-8 bg-gray-50 min-h-screen w-full">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="text-blue-600" size={28} /> Campaign Comparator
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Launch A/B campaigns in an isolated workflow and compare variant performance without affecting your existing campaign creator flow.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Launch Comparator Campaign</h2>
          <form className="space-y-4" onSubmit={handleLaunch}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Campaign name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <select
                value={form.segmentId}
                onChange={(e) => setForm((prev) => ({ ...prev, segmentId: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select segment</option>
                {segments.map((segment) => (
                  <option key={segment._id || segment.id} value={segment._id || segment.id}>
                    {segment.name} ({segment.customerCount || 0} customers)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <textarea
                rows={4}
                value={form.variantA}
                onChange={(e) => setForm((prev) => ({ ...prev, variantA: e.target.value }))}
                placeholder="Variant A message"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <textarea
                rows={4}
                value={form.variantB}
                onChange={(e) => setForm((prev) => ({ ...prev, variantB: e.target.value }))}
                placeholder="Variant B message"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Split Ratio (% to Variant A)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={form.splitRatio}
                  onChange={(e) => setForm((prev) => ({ ...prev, splitRatio: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Landing URL (optional)</label>
                <input
                  type="url"
                  value={form.landingUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, landingUrl: e.target.value }))}
                  placeholder="https://your-offer-page.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Launching...' : 'Launch Comparator'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-emerald-600" /> Comparator Analytics
          </h2>

          <div className="mb-4">
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full md:w-[420px] border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">Select comparator campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign._id || campaign.id} value={campaign._id || campaign.id}>
                  {campaign.name} - {new Date(campaign.createdAt).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {selectedCampaign && (
            <div className="mb-4 text-sm text-gray-600">
              <p>
                Split: <span className="font-medium">A {selectedCampaign.splitRatio}% / B {100 - selectedCampaign.splitRatio}%</span>
              </p>
            </div>
          )}

          {statsLoading ? (
            <p className="text-sm text-gray-500">Loading stats...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Metric</th>
                    <th className="px-4 py-3 text-left font-semibold text-blue-700">Variant A</th>
                    <th className="px-4 py-3 text-left font-semibold text-purple-700">Variant B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {metricRows.map((row) => (
                    <tr key={row.key}>
                      <td className="px-4 py-3 text-gray-700">{row.label}</td>
                      <td className="px-4 py-3 text-gray-900">{stats.A[row.key]}{row.suffix || ''}</td>
                      <td className="px-4 py-3 text-gray-900">{stats.B[row.key]}{row.suffix || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
            <Trophy size={18} />
            Winner: <span className="font-semibold">{winner ? `Variant ${winner}` : 'No winner yet'}</span>
            <span className="text-xs text-amber-800">(based on {winnerBasis})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
