import React, { useEffect, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Compass,
  ImagePlus,
  Landmark as LandmarkIcon,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { Governorate, GovernorateProfile } from '../types/tourism';
import { getGovernorateCoverImage } from '../utils/supabaseSync';

interface GovernorateProfileCardProps {
  governorate: Governorate;
  profile: GovernorateProfile;
  totalLandmarksCount: number;
  unescoCount: number;
  isAdmin?: boolean;
  onManagePhotos?: (governorate: Governorate, profile: GovernorateProfile) => void;
}

export const GovernorateProfileCard: React.FC<GovernorateProfileCardProps> = ({
  governorate,
  profile,
  totalLandmarksCount,
  unescoCount,
  isAdmin = false,
  onManagePhotos,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Automatically expand whenever the user switches to a different governorate
  useEffect(() => {
    setIsExpanded(true);
  }, [governorate.id]);

  const coverUrl = getGovernorateCoverImage(profile);

  return (
    <section
      data-testid="governorate-profile-card"
      aria-labelledby="governorate-profile-heading"
      className="mt-6 overflow-hidden rounded-2xl border border-[#C89B3C]/35 bg-white/90 shadow-sm backdrop-blur-sm dark:border-[#C89B3C]/28 dark:bg-[#132529]/95"
    >
      {/* Top Heritage Accent Band */}
      <div className="h-1 w-full bg-gradient-to-l from-[#0F3D3E] via-[#C89B3C] to-[#1B4B72]" />

      {/* Optional Admin-Uploaded Governorate Cover Banner */}
      {coverUrl && (
        <div className="relative h-44 w-full overflow-hidden bg-[#18292D] sm:h-56">
          <img
            key={coverUrl}
            src={coverUrl}
            alt={`صورة غلاف محافظة ${governorate.name_ar}`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D1B1E]/60 via-transparent to-transparent"
          />
        </div>
      )}

      {/* Header Row (Always Visible) */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#1B4B72] dark:text-[#96C2E6]">
              <Compass className="h-3.5 w-3.5 shrink-0 text-[#C89B3C]" aria-hidden="true" />
              <span>عن المحافظة</span>
              <span aria-hidden="true" className="text-[#C89B3C]">·</span>
              <span>{governorate.region}</span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3
                id="governorate-profile-heading"
                className="font-heritage text-2xl font-bold text-[#0F3D3E] dark:text-[#F4EFE6] sm:text-3xl"
              >
                محافظة {governorate.name_ar}
              </h3>
              <span
                className="text-xs font-medium text-[#6B7A76] dark:text-[#8E9D98]"
                dir="ltr"
              >
                {governorate.name_en}
              </span>
            </div>

            {/* Famous Nicknames */}
            {profile.nicknames_ar.length > 0 && (
              <p
                data-testid="governorate-nicknames"
                className="mt-2 text-sm font-semibold text-[#8A6518] dark:text-[#E7C87B]"
              >
                <span className="font-normal text-[#5C6A66] dark:text-[#9AA8A3]">
                  ألقابها الشهيرة:{' '}
                </span>
                {profile.nicknames_ar.join('  ·  ')}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            {isAdmin && onManagePhotos && (
              <button
                type="button"
                data-testid="admin-gov-photos-btn"
                onClick={() => onManagePhotos(governorate, profile)}
                className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#C89B3C]/50 bg-[#C89B3C]/14 px-3.5 py-2 text-xs font-bold text-[#7B5B17] transition-colors hover:bg-[#C89B3C]/24 dark:text-[#E7C87B] whitespace-nowrap"
              >
                <ImagePlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>إدارة الصور</span>
              </button>
            )}

            <button
              type="button"
              data-testid="governorate-profile-toggle"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-controls="governorate-profile-details"
              className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl border border-[#0F3D3E]/18 bg-[#F9F6F0] px-4 py-2 text-xs font-semibold text-[#0F3D3E] transition-colors hover:bg-[#EFE9DC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89B3C] dark:border-[#C89B3C]/28 dark:bg-[#0D1B1E] dark:text-[#E7C87B] dark:hover:bg-[#193035] whitespace-nowrap"
            >
              <span>{isExpanded ? 'طيّ بطاقة المحافظة' : 'عرض نبذة المحافظة'}</span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Key Metadata Strip: Total Landmarks, UNESCO Count, Best Time */}
        <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-[#0F3D3E]/10 pt-4 dark:border-[#C89B3C]/16 sm:grid-cols-3">
          <div className="flex items-start gap-2.5">
            <LandmarkIcon
              className="mt-0.5 h-4 w-4 shrink-0 text-[#C89B3C]"
              aria-hidden="true"
            />
            <div>
              <dt className="text-[11px] font-medium text-[#5C6A66] dark:text-[#9AA8A3]">
                إجمالي المعالم الموثّقة
              </dt>
              <dd
                data-testid="governorate-landmark-count"
                className="mt-0.5 text-sm font-bold text-[#0F3D3E] dark:text-[#F4EFE6] tabular-nums"
              >
                {totalLandmarksCount}{' '}
                {totalLandmarksCount === 1 ? 'معلم' : totalLandmarksCount === 2 ? 'معلمان' : 'معالم'}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Calendar
              className="mt-0.5 h-4 w-4 shrink-0 text-[#C89B3C]"
              aria-hidden="true"
            />
            <div>
              <dt className="text-[11px] font-medium text-[#5C6A66] dark:text-[#9AA8A3]">
                أفضل وقت للزيارة
              </dt>
              <dd className="mt-0.5 text-xs font-semibold leading-relaxed text-[#1A2421] dark:text-[#F1ECE2]">
                {profile.best_time_to_visit_ar}
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Award
              className="mt-0.5 h-4 w-4 shrink-0 text-[#C89B3C]"
              aria-hidden="true"
            />
            <div>
              <dt className="text-[11px] font-medium text-[#5C6A66] dark:text-[#9AA8A3]">
                التراث العالمي (يونسكو)
              </dt>
              <dd className="mt-0.5 text-xs font-semibold leading-relaxed text-[#1A2421] dark:text-[#F1ECE2]">
                {unescoCount === 0
                  ? 'معالم تاريخية وتراثية وطنية أصيلة'
                  : unescoCount === 1
                    ? 'موقع واحد مُدرج في قائمة اليونسكو'
                    : `${unescoCount} مواقع مُدرجة في قائمة اليونسكو`}
              </dd>
            </div>
          </div>
        </dl>

        {/* Expandable Comprehensive Arabic Narrative */}
        {isExpanded && (
          <div
            id="governorate-profile-details"
            data-testid="governorate-profile-details"
            className="mt-5 grid grid-cols-1 gap-5 border-t border-[#0F3D3E]/10 pt-5 dark:border-[#C89B3C]/16 lg:grid-cols-3"
          >
            <article className="rounded-xl border border-[#0F3D3E]/10 bg-[#F9F6F0]/75 p-4 dark:border-[#C89B3C]/14 dark:bg-[#0D1B1E]/65">
              <h4 className="flex items-center gap-2 font-heritage text-lg font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                <BookOpen className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                <span>نبذة تاريخية وجغرافية</span>
              </h4>
              <p className="mt-2 text-sm leading-[1.85] text-[#2F3B38] dark:text-[#D5DDD9]">
                {profile.overview_ar}
              </p>
            </article>

            <article className="rounded-xl border border-[#0F3D3E]/10 bg-[#F9F6F0]/75 p-4 dark:border-[#C89B3C]/14 dark:bg-[#0D1B1E]/65">
              <h4 className="flex items-center gap-2 font-heritage text-lg font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                <Sparkles className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                <span>الهوية الثقافية</span>
              </h4>
              <p className="mt-2 text-sm leading-[1.85] text-[#2F3B38] dark:text-[#D5DDD9]">
                {profile.cultural_identity_ar}
              </p>
            </article>

            <article className="rounded-xl border border-[#0F3D3E]/10 bg-[#F9F6F0]/75 p-4 dark:border-[#C89B3C]/14 dark:bg-[#0D1B1E]/65">
              <h4 className="flex items-center gap-2 font-heritage text-lg font-bold text-[#0F3D3E] dark:text-[#E7C87B]">
                <UtensilsCrossed className="h-4 w-4 shrink-0 text-[#C89B3C]" aria-hidden="true" />
                <span>التقاليد والمطبخ المحلي</span>
              </h4>
              <p className="mt-2 text-sm leading-[1.85] text-[#2F3B38] dark:text-[#D5DDD9]">
                {profile.traditions_cuisine_ar}
              </p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
};
