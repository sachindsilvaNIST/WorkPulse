using NistAttendance.Api.Data.Entities;
using NistAttendance.Models;

namespace NistAttendance.Api.Mapping;

public static class EntityMapper
{
    // --- AttendanceMonth <-> MonthlyData ---

    public static MonthlyData ToMonthlyData(this AttendanceMonthEntity entity)
    {
        return new MonthlyData
        {
            Year = entity.Year,
            Month = entity.Month,
            MonthLabel = entity.MonthLabel,
            Title = entity.Title,
            Records = entity.Records.Select(r => r.ToAttendanceRecord()).OrderBy(r => r.Date).ToList()
        };
    }

    public static AttendanceMonthEntity ToEntity(this MonthlyData data, string userId)
    {
        return new AttendanceMonthEntity
        {
            UserId = userId,
            Year = data.Year,
            Month = data.Month,
            MonthLabel = data.MonthLabel,
            Title = data.Title,
            LastModifiedUtc = DateTime.UtcNow,
            Records = data.Records.Select(r => r.ToEntity()).ToList()
        };
    }

    // --- AttendanceRecord <-> AttendanceRecordEntity ---

    public static AttendanceRecord ToAttendanceRecord(this AttendanceRecordEntity entity)
    {
        return new AttendanceRecord
        {
            Date = entity.Date,
            DayType = Enum.TryParse<DayType>(entity.DayType, out var dt) ? dt : DayType.WorkDay,
            HolidayName = entity.HolidayName,
            TripCategory = string.IsNullOrEmpty(entity.TripCategory) ? null
                : Enum.TryParse<TripCategory>(entity.TripCategory, out var tc) ? tc : null,
            TripRegion = entity.TripRegion,
            LoginTime = entity.LoginTime,
            LogoutTime = entity.LogoutTime,
            OvertimeHours = entity.OvertimeHours,
            OvertimeMinutes = entity.OvertimeMinutes,
            IsOvertime = entity.IsOvertime,
            IsOvertimeDecided = entity.IsOvertimeDecided
        };
    }

    public static AttendanceRecordEntity ToEntity(this AttendanceRecord record)
    {
        return new AttendanceRecordEntity
        {
            Date = record.Date,
            DayType = record.DayType.ToString(),
            HolidayName = record.HolidayName,
            TripCategory = record.TripCategory?.ToString(),
            TripRegion = record.TripRegion,
            LoginTime = record.LoginTime,
            LogoutTime = record.LogoutTime,
            OvertimeHours = record.OvertimeHours,
            OvertimeMinutes = record.OvertimeMinutes,
            IsOvertime = record.IsOvertime,
            IsOvertimeDecided = record.IsOvertimeDecided
        };
    }

    // --- Contact <-> ContactRecord ---

    public static ContactRecord ToContactRecord(this ContactEntity entity)
    {
        return new ContactRecord
        {
            Id = entity.Id,
            Affiliation = entity.Affiliation,
            FamilyName = entity.FamilyName,
            GivenName = entity.GivenName,
            Department = entity.Department,
            Email = entity.Email,
            Intercom = entity.Intercom,
            ContactNumber = entity.ContactNumber,
            Notes = entity.Notes
        };
    }

    public static ContactEntity ToEntity(this ContactRecord record, string userId)
    {
        return new ContactEntity
        {
            Id = string.IsNullOrEmpty(record.Id) ? Guid.NewGuid().ToString() : record.Id,
            UserId = userId,
            Affiliation = record.Affiliation,
            FamilyName = record.FamilyName,
            GivenName = record.GivenName,
            Department = record.Department,
            Email = record.Email,
            Intercom = record.Intercom,
            ContactNumber = record.ContactNumber,
            Notes = record.Notes,
            LastModifiedUtc = DateTime.UtcNow
        };
    }

    // --- UserSettings <-> AppSettings ---

    public static AppSettings ToAppSettings(this UserSettingsEntity entity)
    {
        return new AppSettings
        {
            StandardLoginTime = entity.StandardLoginTime,
            StandardLogoutTime = entity.StandardLogoutTime,
            OvertimeBreakDeductionMinutes = entity.OvertimeBreakDeductionMinutes,
            DefaultTitle = entity.DefaultTitle,
            LastOpenedMonth = entity.LastOpenedMonth,
            ThemeVariant = entity.ThemeVariant,
            FontSizePreset = entity.FontSizePreset
        };
    }

    public static UserSettingsEntity ToEntity(this AppSettings settings, string userId)
    {
        return new UserSettingsEntity
        {
            UserId = userId,
            StandardLoginTime = settings.StandardLoginTime,
            StandardLogoutTime = settings.StandardLogoutTime,
            OvertimeBreakDeductionMinutes = settings.OvertimeBreakDeductionMinutes,
            DefaultTitle = settings.DefaultTitle,
            LastOpenedMonth = settings.LastOpenedMonth,
            ThemeVariant = settings.ThemeVariant,
            FontSizePreset = settings.FontSizePreset
        };
    }
}
