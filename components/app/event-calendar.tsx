// 月間カレンダー（マイページ／会を探す 共通）
// - ドット表示する日付を markedDates（Set）で受け取る汎用カレンダー。
// - 状態（表示月・選択日）は親が持つ「制御コンポーネント」。ロジック重複を解消するために抽出。
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatMonth(year: number, month: number) {
  return `${year}年${month + 1}月`;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

interface EventCalendarProps {
  viewYear: number;
  viewMonth: number; // 0-11
  selectedDate: string | null;
  markedDates: Set<string>; // ドットを出す日付（YYYY-MM-DD）
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: string | null) => void;
  legendLabel: string; // ドットの凡例（例: 参加した会 / イベントあり）
}

export function EventCalendar({
  viewYear,
  viewMonth,
  selectedDate,
  markedDates,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  legendLabel,
}: EventCalendarProps) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:sticky lg:top-24">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <span className="text-sm font-bold text-gray-900">
          {formatMonth(viewYear, viewMonth)}
        </span>
        <button
          onClick={onNextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-medium py-1 ${
              i === 0
                ? "text-red-400"
                : i === 6
                  ? "text-blue-400"
                  : "text-gray-400"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = toDateStr(viewYear, viewMonth, day);
          const hasMark = markedDates.has(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday =
            viewYear === today.getFullYear() &&
            viewMonth === today.getMonth() &&
            day === today.getDate();
          const dayOfWeek = (firstDay + i) % 7;

          return (
            <button
              key={day}
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all relative ${
                isSelected
                  ? "bg-gray-900 text-white"
                  : isToday
                    ? "bg-amber-50 text-amber-700 font-bold"
                    : dayOfWeek === 0
                      ? "text-red-400 hover:bg-gray-50"
                      : dayOfWeek === 6
                        ? "text-blue-400 hover:bg-gray-50"
                        : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {day}
              {hasMark && (
                <span
                  className={`absolute bottom-1 w-1 h-1 rounded-full ${
                    isSelected ? "bg-amber-400" : "bg-amber-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {legendLabel}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded bg-amber-50 border border-amber-200" />
          今日
        </div>
      </div>
    </div>
  );
}
