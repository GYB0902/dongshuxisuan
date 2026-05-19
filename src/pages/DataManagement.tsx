import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Database, Download, FileText, Filter, MoreHorizontal, Upload } from 'lucide-react';
import { downloadCsv, notify } from '../lib/actions';

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/{2,}/g, '/');

type Dataset = {
  id: string;
  name: string;
  type: string;
  size: string;
  updated: string;
  status: string;
};

const INITIAL_DATASETS: Dataset[] = [
  { id: 'DS-2025-001', name: '内蒙古绿色算力实爬快照', type: '遥测', size: '186 MB', updated: '2025-07-21', status: '已核验' },
  { id: 'DS-2025-002', name: '盟市绿电占比月度汇总', type: '因子', size: '34 MB', updated: '2025-07-18', status: '已启用' },
  { id: 'DS-2025-003', name: '数据中心碳强度监测明细', type: '遥测', size: '1.8 GB', updated: '2025-07-16', status: '处理中' },
  { id: 'DS-2025-004', name: '和林格尔新区算力规模台账', type: '负载', size: '426 MB', updated: '2025-07-10', status: '已核验' },
  { id: 'DS-2025-005', name: '东数西算政策效果资料包', type: '政策', size: '18 MB', updated: '2025-07-08', status: '已启用' },
  { id: 'DS-2025-006', name: '新能源装机与消纳基础表', type: '因子', size: '52 MB', updated: '2025-07-03', status: '已核验' },
  { id: 'DS-2025-007', name: 'PUE逐日采集日志-乌兰察布', type: '遥测', size: '2.6 GB', updated: '2025-06-29', status: '处理中' },
  { id: 'DS-2025-008', name: '智算负载迁移调度记录', type: '负载', size: '913 MB', updated: '2025-06-25', status: '已启用' },
  { id: 'DS-2024-001', name: '全国电网排放因子上半年', type: '因子', size: '12 MB', updated: '2024-06-15', status: '已核验' },
  { id: 'DS-2024-002', name: '数据中心PUE日志-枢纽A', type: '遥测', size: '845 MB', updated: '2024-07-01', status: '处理中' },
  { id: 'DS-2024-003', name: '2025能源结构方案', type: '政策', size: '2.4 MB', updated: '2024-06-28', status: '已启用' },
  { id: 'DS-2024-004', name: '区域服务器负载库', type: '负载', size: '1.2 GB', updated: '2024-07-02', status: '已启用' },
  { id: 'DS-2024-005', name: '自治区能源平衡表清洗结果', type: '因子', size: '76 MB', updated: '2024-06-20', status: '已核验' },
  { id: 'DS-2024-006', name: '重点机房液冷改造清单', type: '政策', size: '9.8 MB', updated: '2024-06-12', status: '已启用' },
  { id: 'DS-2024-007', name: '服务器机架利用率小时表', type: '负载', size: '1.5 GB', updated: '2024-06-08', status: '已核验' },
  { id: 'DS-2024-008', name: '碳排放核算原始凭证集', type: '遥测', size: '684 MB', updated: '2024-05-30', status: '待核验' },
  { id: 'DS-2023-001', name: '基期碳排放核算底表', type: '因子', size: '41 MB', updated: '2023-12-28', status: '已核验' },
  { id: 'DS-2023-002', name: '历史算力规模与用电量表', type: '负载', size: '327 MB', updated: '2023-12-20', status: '已核验' },
];

const categories = [
  { name: '全部数据集', type: '全部', icon: Database },
  { name: '排放因子', type: '因子', icon: FileText },
  { name: '原始遥测', type: '遥测', icon: Database },
  { name: '政策文档', type: '政策', icon: FileText },
  { name: '负载数据', type: '负载', icon: Database },
];

const pageSize = 8;

function formatFileSize(size: number) {
  if (size > 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function DataManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [datasets, setDatasets] = useState(INITIAL_DATASETS);
  const [activeType, setActiveType] = useState('全部');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const filteredDatasets = useMemo(
    () => (activeType === '全部' ? datasets : datasets.filter((item) => item.type === activeType)),
    [activeType, datasets],
  );

  const totalPages = Math.max(1, Math.ceil(filteredDatasets.length / pageSize));
  const visibleDatasets = filteredDatasets.slice((page - 1) * pageSize, page * pageSize);
  const allVisibleSelected = visibleDatasets.length > 0 && visibleDatasets.every((item) => selectedIds.includes(item.id));

  const handleCategoryChange = (type: string) => {
    setActiveType(type);
    setSelectedIds([]);
    setPage(1);
    notify(type === '全部' ? '已显示全部数据集' : `已筛选${type}类数据`);
  };

  const handleUpload = (files: FileList | null) => {
    const file = files?.[0];

    if (!file) return;

    const today = new Date().toISOString().slice(0, 10);
    const nextDataset: Dataset = {
      id: `DS-NEW-${String(datasets.length + 1).padStart(3, '0')}`,
      name: file.name,
      type: '遥测',
      size: formatFileSize(file.size),
      updated: today,
      status: '待核验',
    };

    setDatasets((items) => [nextDataset, ...items]);
    setActiveType('全部');
    setSelectedIds([]);
    setPage(1);
    notify(`已加入数据集：${file.name}`);
  };

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((ids) => ids.filter((id) => !visibleDatasets.some((item) => item.id === id)));
      return;
    }

    setSelectedIds((ids) => Array.from(new Set([...ids, ...visibleDatasets.map((item) => item.id)])));
  };

  const handleRowSelect = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  };

  const handleExportRow = (item: Dataset) => {
    downloadCsv(`${item.id}.csv`, [item]);
    notify(`已导出${item.name}`);
  };

  return (
    <div className="relative min-h-[calc(100vh-56px)] overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-100"
        style={{ backgroundImage: `url(${assetUrl('images/data-preview-bg.png')})` }}
      />
      <div className="pointer-events-none absolute inset-0 bg-white/76 backdrop-blur-[1px]" />
      <div className="relative mx-auto w-full max-w-[1600px] p-6 md:p-8">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".csv,.xlsx,.xls,.json,.txt"
        onChange={(event) => {
          handleUpload(event.target.files);
          event.currentTarget.value = '';
        }}
      />

      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-headline text-2xl font-bold text-slate-900">数据源管理</h2>
          <p className="mt-1 text-sm text-slate-500">
            管理配置文件、排放因子和原始遥测数据，支持本地加入、筛选、分页和导出。
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleCategoryChange(activeType === '全部' ? '遥测' : '全部')}
            className="flex items-center gap-2 rounded-lg border border-white/70 bg-white/80 px-4 py-2.5 font-bold text-slate-700 shadow-sm backdrop-blur-xl transition-colors hover:bg-white"
          >
            <Filter className="h-4 w-4" />
            {activeType === '全部' ? '筛选遥测' : '取消筛选'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Upload className="h-4 w-4" />
            上传数据集
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-64">
          <nav className="space-y-1 rounded-xl border border-white/70 bg-white/60 p-2 shadow-sm backdrop-blur-xl">
            {categories.map((category) => {
              const Icon = category.icon;
              const active = activeType === category.type;

              return (
                <button
                  key={category.type}
                  type="button"
                  onClick={() => handleCategoryChange(category.type)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm transition-colors ${
                    active
                      ? 'bg-white font-bold text-emerald-700 shadow-sm'
                      : 'font-medium text-slate-600 hover:bg-white/75'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-white/70 bg-white/76 shadow-sm backdrop-blur-2xl">
          <div className="border-b border-white/70 bg-white/50 px-6 py-4 text-sm font-bold text-slate-600">
            当前筛选：{activeType === '全部' ? '全部数据集' : activeType}，已选 {selectedIds.length} 条
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="border-b border-slate-200 bg-white/55 text-xs font-bold uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-6 py-4">数据集名称</th>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">类型</th>
                  <th className="px-6 py-4">大小</th>
                  <th className="px-6 py-4">最后更新</th>
                  <th className="px-6 py-4">状态</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleDatasets.map((item) => (
                  <tr key={item.id} className="group transition-colors hover:bg-white/72">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => handleRowSelect(item.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{item.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.type}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.size}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.updated}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.status === '已启用' || item.status === '已核验'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {(item.status === '已启用' || item.status === '已核验') && <CheckCircle2 className="h-3 w-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleExportRow(item)}
                        className="inline-flex items-center gap-2 rounded-lg p-2 text-slate-400 opacity-0 transition-colors hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                        aria-label={`导出${item.name}`}
                      >
                        <Download className="h-4 w-4" />
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-white/70 bg-white/42 p-4 text-sm text-slate-500">
            <span>
              显示第 {(page - 1) * pageSize + 1} 到 {Math.min(page * pageSize, filteredDatasets.length)} 条，共 {filteredDatasets.length} 条
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page === 1}
                className="rounded border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50 disabled:text-slate-300"
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={`rounded border px-3 py-1 ${
                    pageNumber === page
                      ? 'border-emerald-600 bg-emerald-50 font-medium text-emerald-700'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {pageNumber}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={page === totalPages}
                className="rounded border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50 disabled:text-slate-300"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
