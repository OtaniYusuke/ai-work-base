import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { dataSources } from '../data/mockData';

export default function DataSourceDetail() {
  const { id } = useParams<{ id: string }>();
  const ds = dataSources.find((d) => d.id === id);

  const [search, setSearch] = useState('');
  const [factClaim, setFactClaim] = useState('');
  const [factResult, setFactResult] = useState<string | null>(null);
  const [factChecking, setFactChecking] = useState(false);

  if (!ds) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">データ元本が見つかりません (ID: {id})</p>
      </div>
    );
  }

  // Dynamic column keys from records
  const columnKeys =
    ds.records.length > 0 ? Object.keys(ds.records[0]) : [];

  // Filter records by search
  const filteredRecords = ds.records.filter((record) => {
    if (!search) return true;
    return Object.values(record).some((val) =>
      String(val).toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleFactCheck = () => {
    if (!factClaim.trim()) return;
    setFactChecking(true);
    setFactResult(null);
    // Mock async verification
    setTimeout(() => {
      const matchingRecords = ds.records.filter((r) =>
        Object.values(r).some((v) =>
          String(v).toLowerCase().includes(factClaim.toLowerCase().split(' ')[0])
        )
      );
      if (matchingRecords.length > 0) {
        setFactResult(
          `検証結果: ${matchingRecords.length}件の関連レコードが見つかりました。データ元本の内容と照合した結果、この主張は「裏付けあり」と判定されました。`
        );
      } else {
        setFactResult(
          '検証結果: 関連するレコードが見つかりませんでした。この主張は「裏付けなし」と判定されました。データ元本に該当するデータが存在しない可能性があります。'
        );
      }
      setFactChecking(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/datasources" className="text-sm text-gray-500 hover:text-gray-700">
          &larr; 一覧へ
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{ds.name}</h1>
        <span className="inline-block rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {ds.type}
        </span>
      </div>

      <p className="text-sm text-gray-600">{ds.schemaDescription}</p>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="レコードを検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columnKeys.map((key) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.map((record, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                {columnKeys.map((key) => (
                  <td key={key} className="px-4 py-3 text-sm text-gray-700">
                    {String(record[key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {filteredRecords.length === 0 && (
              <tr>
                <td
                  colSpan={columnKeys.length}
                  className="px-4 py-8 text-center text-sm text-gray-400"
                >
                  該当するレコードがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Fact Check Panel */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">ファクトチェック</h2>
        <p className="text-sm text-gray-500 mb-4">
          主張を入力すると、このデータ元本の内容と照合して検証します。
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="検証したい主張を入力..."
            value={factClaim}
            onChange={(e) => setFactClaim(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFactCheck()}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleFactCheck}
            disabled={factChecking || !factClaim.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {factChecking ? '検証中...' : '検証する'}
          </button>
        </div>
        {factResult && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            {factResult}
          </div>
        )}
      </div>
    </div>
  );
}
