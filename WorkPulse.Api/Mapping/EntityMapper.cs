using WorkPulse.Api.Data.Entities;
using WorkPulse.Models;

namespace WorkPulse.Api.Mapping;

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
            LastModifiedUtc = entity.LastModifiedUtc,
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
            LeaveHours = entity.LeaveHours,
            LeaveMinutes = entity.LeaveMinutes,
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
            LeaveHours = record.LeaveHours,
            LeaveMinutes = record.LeaveMinutes,
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
            Notes = entity.Notes,
            LastModifiedUtc = entity.LastModifiedUtc
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

    // --- QuickLink <-> QuickLinkEntity ---

    public static QuickLink ToQuickLink(this QuickLinkEntity entity)
    {
        return new QuickLink
        {
            Id = entity.Id,
            Label = entity.Label,
            Url = entity.Url,
            Category = entity.Category,
            Keywords = entity.Keywords,
            SortOrder = entity.SortOrder,
            LastModifiedUtc = entity.LastModifiedUtc
        };
    }

    public static QuickLinkEntity ToEntity(this QuickLink record, string userId)
    {
        return new QuickLinkEntity
        {
            Id = string.IsNullOrEmpty(record.Id) ? Guid.NewGuid().ToString() : record.Id,
            UserId = userId,
            Label = record.Label,
            Url = record.Url,
            Category = record.Category,
            Keywords = record.Keywords,
            SortOrder = record.SortOrder,
            LastModifiedUtc = DateTime.UtcNow
        };
    }

    // --- DailyReport <-> DailyReportEntity ---

    public static DailyReport ToDailyReport(this DailyReportEntity entity)
    {
        return new DailyReport
        {
            Id = entity.Id,
            ReportDate = entity.ReportDate,
            Title = entity.Title,
            Body = entity.Body,
            LastModifiedUtc = entity.LastModifiedUtc
        };
    }

    public static DailyReportEntity ToEntity(this DailyReport record, string userId)
    {
        return new DailyReportEntity
        {
            Id = string.IsNullOrEmpty(record.Id) ? Guid.NewGuid().ToString() : record.Id,
            UserId = userId,
            ReportDate = record.ReportDate,
            Title = record.Title,
            Body = record.Body,
            LastModifiedUtc = DateTime.UtcNow
        };
    }

    // --- WeeklyReport <-> WeeklyReportEntity ---

    public static WeeklyReport ToWeeklyReport(this WeeklyReportEntity entity)
    {
        return new WeeklyReport
        {
            Id = entity.Id,
            WeekStartDate = entity.WeekStartDate,
            Title = entity.Title,
            Body = entity.Body,
            LastModifiedUtc = entity.LastModifiedUtc
        };
    }

    public static WeeklyReportEntity ToEntity(this WeeklyReport record, string userId)
    {
        return new WeeklyReportEntity
        {
            Id = string.IsNullOrEmpty(record.Id) ? Guid.NewGuid().ToString() : record.Id,
            UserId = userId,
            WeekStartDate = record.WeekStartDate,
            Title = record.Title,
            Body = record.Body,
            LastModifiedUtc = DateTime.UtcNow
        };
    }

    // --- TripReport <-> TripReportEntity ---

    public static TripReport ToTripReport(this TripReportEntity entity)
    {
        return new TripReport
        {
            Id = entity.Id,
            Category = Enum.TryParse<TripCategory>(entity.Category, out var tc) ? tc : TripCategory.Domestic,
            Destination = entity.Destination,
            StartDate = entity.StartDate,
            EndDate = entity.EndDate,
            Purpose = entity.Purpose,
            Notes = entity.Notes,
            LastModifiedUtc = entity.LastModifiedUtc
        };
    }

    public static TripReportEntity ToEntity(this TripReport record, string userId)
    {
        return new TripReportEntity
        {
            Id = string.IsNullOrEmpty(record.Id) ? Guid.NewGuid().ToString() : record.Id,
            UserId = userId,
            Category = record.Category.ToString(),
            Destination = record.Destination,
            StartDate = record.StartDate,
            EndDate = record.EndDate,
            Purpose = record.Purpose,
            Notes = record.Notes,
            LastModifiedUtc = DateTime.UtcNow
        };
    }

    // --- TripDocumentMeta <-> TripDocumentEntity ---

    public static TripDocumentMeta ToMeta(this TripDocumentEntity entity)
    {
        return new TripDocumentMeta
        {
            Id = entity.Id,
            TripReportId = entity.TripReportId,
            Category = entity.Category,
            Label = entity.Label,
            FileName = entity.FileName,
            ContentType = entity.ContentType,
            SizeBytes = entity.SizeBytes,
            UploadedUtc = entity.UploadedUtc,
            DocumentDate = entity.DocumentDate,
            DriveFileId = entity.DriveFileId,
            DriveWebViewLink = entity.DriveWebViewLink
        };
    }

    public static ReimbursementCategory ToDto(this ReimbursementCategoryEntity entity)
    {
        return new ReimbursementCategory { Id = entity.Id, Name = entity.Name };
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
            FontSizePreset = entity.FontSizePreset,
            DateFormat = entity.DateFormat,
            WeekStartDay = entity.WeekStartDay,
            DefaultLandingPage = entity.DefaultLandingPage,
            IdleTimeoutMinutes = entity.IdleTimeoutMinutes,
            NotificationsEnabled = entity.NotificationsEnabled
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
            FontSizePreset = settings.FontSizePreset,
            DateFormat = settings.DateFormat,
            WeekStartDay = settings.WeekStartDay,
            DefaultLandingPage = settings.DefaultLandingPage,
            IdleTimeoutMinutes = settings.IdleTimeoutMinutes,
            NotificationsEnabled = settings.NotificationsEnabled
        };
    }
}
