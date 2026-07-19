import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import { FileText, HardDrive, Star, Archive, Download, TrendingUp, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { formatBytes } from '@/utils';
import { getFileTypeCategory, FILE_CATEGORIES } from '@/types';
import { DashboardSkeleton } from '@/components/ui';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#14b8a6', '#6366f1', '#f97316', '#ec4899', '#22d3ee', '#a78bfa', '#94a3b8'];

interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: string;
  subtitle?: string;
  color: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subtitle, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="glass-card p-5 rounded-2xl"
  >
    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}15` }}>
      {React.cloneElement(icon, { className: 'w-5 h-5', style: { color } } as React.ComponentProps<any>)}
    </div>
    <h3 className="text-2xl font-bold text-[var(--text-primary)]">{value}</h3>
    <p className="text-sm text-[var(--text-secondary)]">{label}</p>
    {subtitle && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{subtitle}</p>}
  </motion.div>
);

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }> = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="glass-strong px-3 py-2 rounded-xl text-xs shadow-lg">
      {label && <p className="text-[var(--text-primary)] font-medium mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatBytes(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export const DashboardCharts: React.FC = () => {
  const allDocs = useAppStore((s) => s.documents);

  const [storage, setStorage] = React.useState({ used: 0, total: 0 });
  React.useEffect(() => {
    const docs = allDocs || [];
    const used = docs.reduce((sum, doc) => sum + doc.size, 0);
    navigator.storage.estimate().then((est) => {
      setStorage({ used, total: est.quota ?? 10 * 1024 * 1024 * 1024 });
    }).catch(() => {
      setStorage({ used, total: 10 * 1024 * 1024 * 1024 });
    });
  }, [allDocs]);

  const stats = useMemo(() => {
    if (!allDocs) return null;

    // Filter documents into states
    const activeDocs = allDocs.filter((d) => d.isDeleted === 0 && d.isArchived === 0);
    const archivedDocs = allDocs.filter((d) => d.isDeleted === 0 && d.isArchived === 1);
    const deletedDocs = allDocs.filter((d) => d.isDeleted === 1);

    const activeSize = activeDocs.reduce((sum, d) => sum + d.size, 0);
    const favCount = activeDocs.filter((d) => d.isFavorite === 1).length;
    const compressedCount = activeDocs.filter((d) => d.compressedSize !== null).length;

    const archivedCount = archivedDocs.length;
    const archivedSize = archivedDocs.reduce((sum, d) => sum + d.size, 0);

    const trashCount = deletedDocs.length;
    const trashSize = deletedDocs.reduce((sum, d) => sum + d.size, 0);

    // Files by type (main charts reflect active docs)
    const typeMap: Record<string, number> = {};
    const sizeMap: Record<string, number> = {};
    activeDocs.forEach((d) => {
      const cat = getFileTypeCategory(d.extension);
      const label = FILE_CATEGORIES[cat]?.label || 'Other';
      typeMap[label] = (typeMap[label] || 0) + 1;
      sizeMap[label] = (sizeMap[label] || 0) + d.size;
    });

    const pieData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
    const barData = Object.entries(sizeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Weekly uploads (last 7 days of active docs)
    const now = new Date();
    const weeklyData = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const dayStr = date.toLocaleDateString('en', { weekday: 'short' });
      const count = activeDocs.filter((d) => {
        const uploaded = new Date(d.uploadedAt);
        return uploaded.toDateString() === date.toDateString();
      }).length;
      return { day: dayStr, count };
    });

    // Recently added (active docs)
    const recentlyAdded = [...activeDocs]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .slice(0, 5);

    return {
      totalDocs: activeDocs.length,
      totalSize: activeSize,
      favCount,
      compressedCount,
      archivedCount,
      archivedSize,
      trashCount,
      trashSize,
      pieData,
      barData,
      weeklyData,
      recentlyAdded,
    };
  }, [allDocs]);

  if (!stats) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          icon={<FileText />}
          label="Total Documents"
          value={stats.totalDocs.toLocaleString()}
          subtitle={formatBytes(stats.totalSize)}
          color="#3b82f6"
          delay={0}
        />
        <StatCard
          icon={<HardDrive />}
          label="Storage Used"
          value={formatBytes(storage.used)}
          subtitle={`${storage.total > 0 ? ((storage.used / storage.total) * 100).toFixed(1) : 0}% of ${formatBytes(storage.total)}`}
          color="#8b5cf6"
          delay={0.05}
        />
        <StatCard
          icon={<Star />}
          label="Favorites"
          value={stats.favCount.toLocaleString()}
          color="#f59e0b"
          delay={0.1}
        />
        <StatCard
          icon={<Archive />}
          label="Archived"
          value={stats.archivedCount.toLocaleString()}
          subtitle={formatBytes(stats.archivedSize)}
          color="#06b6d4"
          delay={0.15}
        />
        <StatCard
          icon={<Trash2 />}
          label="Trash"
          value={stats.trashCount.toLocaleString()}
          subtitle={formatBytes(stats.trashSize)}
          color="#f43f5e"
          delay={0.2}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 rounded-2xl"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Files by Type</h3>
          {stats.pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.pieData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs text-[var(--text-secondary)]">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-[var(--text-tertiary)]">
              No files uploaded yet
            </div>
          )}
        </motion.div>

        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 rounded-2xl"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Storage by Type</h3>
          {stats.barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.barData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--border-color)' }}
                />
                <YAxis
                  width={70}
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  tickFormatter={(v: number) => formatBytes(v)}
                />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="value" name="Size" radius={[6, 6, 0, 0]}>
                  {stats.barData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-sm text-[var(--text-tertiary)]">
              No data available
            </div>
          )}
        </motion.div>
      </div>

      {/* Line Chart — Weekly Uploads */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-5 rounded-2xl"
      >
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
          Upload Activity (Last 7 Days)
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={stats.weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-color)' }}
            />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border-color)' }}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="count"
              name="Uploads"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--accent)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Recently Added */}
      {stats.recentlyAdded.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-5 rounded-2xl"
        >
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Recently Added</h3>
          <div className="space-y-2">
            {stats.recentlyAdded.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg-tertiary)]">
                  <FileText className="w-4 h-4 text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{doc.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatBytes(doc.size)}</p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};
