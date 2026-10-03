using WorkPulse.Api.Data.Entities;
using WorkPulse.Api.Services;
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
            CustomSettlementStart = entity.CustomSettlementStart,
            CustomSettlementEnd = entity.CustomSettlementEnd,
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
            CustomSettlementStart = data.CustomSettlementStart,
            CustomSettlementEnd = data.CustomSettlementEnd,
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
            Status = Enum.TryParse<TripStatus>(entity.Status, out var ts) ? ts : TripStatus.Draft,
            LastModifiedUtc = entity.LastModifiedUtc,
            TripNumber = entity.TripNumber,
            DepartmentCode = entity.DepartmentCode,
            ScheduledDeparture = entity.ScheduledDeparture,
            ScheduledReturn = entity.ScheduledReturn,
            TicketArrangementRequest = entity.TicketArrangementRequest,
            Segments = entity.Segments.OrderBy(s => s.SequenceNo).Select(s => s.ToTripSegment()).ToList(),
            BudgetLines = entity.BudgetLines.Select(b => b.ToTripBudgetLine()).ToList()
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
            Status = record.Status.ToString(),
            LastModifiedUtc = DateTime.UtcNow,
            DepartmentCode = record.DepartmentCode,
            // No Kind=Utc coercion needed here anymore — that was a Npgsql/"timestamp with time
            // zone" requirement; BSON's Date type has no such CLR-side Kind requirement.
            ScheduledDeparture = record.ScheduledDeparture,
            ScheduledReturn = record.ScheduledReturn,
            TicketArrangementRequest = record.TicketArrangementRequest,
            Segments = record.Segments.Select(s => s.ToEntity()).ToList(),
            BudgetLines = record.BudgetLines.Select(b => b.ToEntity()).ToList()
        };
    }

    // --- TripSegment <-> TripSegmentEntity ---

    public static TripSegment ToTripSegment(this TripSegmentEntity entity)
    {
        return new TripSegment
        {
            Id = entity.Id,
            SequenceNo = entity.SequenceNo,
            Purpose = entity.Purpose,
            Content = entity.Content,
            ProjectNo = entity.ProjectNo,
            DestinationName = entity.DestinationName,
            PlaceName = entity.PlaceName,
            Date1 = entity.Date1,
            Date2 = entity.Date2
        };
    }

    public static TripSegmentEntity ToEntity(this TripSegment record)
    {
        return new TripSegmentEntity
        {
            SequenceNo = record.SequenceNo,
            Purpose = record.Purpose,
            Content = record.Content,
            ProjectNo = record.ProjectNo,
            DestinationName = record.DestinationName,
            PlaceName = record.PlaceName,
            Date1 = record.Date1,
            Date2 = record.Date2
        };
    }

    // --- TripBudgetLine <-> TripBudgetLineEntity ---

    public static TripBudgetLine ToTripBudgetLine(this TripBudgetLineEntity entity)
    {
        return new TripBudgetLine
        {
            Id = entity.Id,
            Content = entity.Content,
            ExpenseCategory = entity.ExpenseCategory,
            Amount = entity.Amount
        };
    }

    public static TripBudgetLineEntity ToEntity(this TripBudgetLine record)
    {
        return new TripBudgetLineEntity
        {
            Content = record.Content,
            ExpenseCategory = record.ExpenseCategory,
            Amount = record.Amount
        };
    }

    // --- TripSettlement <-> TripSettlementEntity ---
    // TripSettlementEntity is a single embedded sub-document on TripReportEntity now (OwnsOne),
    // not its own top-level collection — it no longer carries its own Id/TripReportId; the trip
    // id is passed in from the controller's own route parameter instead.

    public static TripSettlement ToTripSettlement(this TripSettlementEntity entity, string tripReportId)
    {
        return new TripSettlement
        {
            TripReportId = tripReportId,
            EmployeeNo = entity.EmployeeNo,
            BankAccountNumber = entity.BankAccountNumber,
            Bank = entity.Bank,
            Branch = entity.Branch,
            LocationAtSettlement = entity.LocationAtSettlement,
            Region = entity.Region,
            AccountingCode = entity.AccountingCode,
            SourceDocumentNo = entity.SourceDocumentNo,
            LastModifiedUtc = entity.LastModifiedUtc,
            TransportationLines = entity.TransportationLines.Select(l => l.ToTripSettlementTransportationLine()).ToList(),
            OtherLines = entity.OtherLines.Select(l => l.ToTripSettlementOtherLine()).ToList()
        };
    }

    public static TripSettlementEntity ToEntity(this TripSettlement record)
    {
        return new TripSettlementEntity
        {
            EmployeeNo = record.EmployeeNo,
            BankAccountNumber = record.BankAccountNumber,
            Bank = record.Bank,
            Branch = record.Branch,
            LocationAtSettlement = record.LocationAtSettlement,
            Region = record.Region,
            AccountingCode = record.AccountingCode,
            SourceDocumentNo = record.SourceDocumentNo,
            LastModifiedUtc = DateTime.UtcNow,
            TransportationLines = record.TransportationLines.Select(l => l.ToEntity()).ToList(),
            OtherLines = record.OtherLines.Select(l => l.ToEntity()).ToList()
        };
    }

    // --- TripSettlementTransportationLine <-> TripSettlementTransportationLineEntity ---

    public static TripSettlementTransportationLine ToTripSettlementTransportationLine(this TripSettlementTransportationLineEntity entity)
    {
        return new TripSettlementTransportationLine
        {
            Id = entity.Id,
            Date = entity.Date,
            Content = entity.Content,
            DestinationName = entity.DestinationName,
            PlaceName = entity.PlaceName,
            Route = entity.Route,
            TransportMode = entity.TransportMode,
            DepartureTime = entity.DepartureTime,
            ArrivalTime = entity.ArrivalTime,
            GasCost = entity.GasCost,
            TollCost = entity.TollCost,
            TransportationCost = entity.TransportationCost,
            LodgingCost = entity.LodgingCost,
            DailyAllowance = entity.DailyAllowance
        };
    }

    public static TripSettlementTransportationLineEntity ToEntity(this TripSettlementTransportationLine record)
    {
        return new TripSettlementTransportationLineEntity
        {
            Date = record.Date,
            Content = record.Content,
            DestinationName = record.DestinationName,
            PlaceName = record.PlaceName,
            Route = record.Route,
            TransportMode = record.TransportMode,
            DepartureTime = record.DepartureTime,
            ArrivalTime = record.ArrivalTime,
            GasCost = record.GasCost,
            TollCost = record.TollCost,
            TransportationCost = record.TransportationCost,
            LodgingCost = record.LodgingCost,
            DailyAllowance = record.DailyAllowance
        };
    }

    // --- TripSettlementOtherLine <-> TripSettlementOtherLineEntity ---

    public static TripSettlementOtherLine ToTripSettlementOtherLine(this TripSettlementOtherLineEntity entity)
    {
        return new TripSettlementOtherLine
        {
            Id = entity.Id,
            Date = entity.Date,
            Content = entity.Content,
            Description = entity.Description,
            DepartmentCode = entity.DepartmentCode,
            ExpenseCategoryTaxCode = entity.ExpenseCategoryTaxCode,
            SettlementAmount = entity.SettlementAmount
        };
    }

    public static TripSettlementOtherLineEntity ToEntity(this TripSettlementOtherLine record)
    {
        return new TripSettlementOtherLineEntity
        {
            Date = record.Date,
            Content = record.Content,
            Description = record.Description,
            DepartmentCode = record.DepartmentCode,
            ExpenseCategoryTaxCode = record.ExpenseCategoryTaxCode,
            SettlementAmount = record.SettlementAmount
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
            DriveWebViewLink = entity.DriveWebViewLink,
            Amount = entity.Amount,
            Currency = entity.Currency,
            ReimbursementStatus = Enum.TryParse<ReimbursementStatus>(entity.ReimbursementStatus, out var rs) ? rs : ReimbursementStatus.Pending,
            ResourceId = entity.ResourceId
        };
    }

    public static ReimbursementCategory ToDto(this ReimbursementCategoryEntity entity)
    {
        return new ReimbursementCategory { Id = entity.Id, Name = entity.Name };
    }

    // --- UtilityBill <-> UtilityBillEntity ---
    // Status is never stored — computed from PaidDate/DueDate on every read, so it can't go stale.

    public static UtilityBill ToUtilityBill(this UtilityBillEntity entity)
    {
        return new UtilityBill
        {
            Id = entity.Id,
            Provider = Enum.TryParse<UtilityProvider>(entity.Provider, out var p) ? p : UtilityProvider.TokyoGas,
            BillingYear = entity.BillingYear,
            BillingMonth = entity.BillingMonth,
            PeriodStart = entity.PeriodStart,
            PeriodEnd = entity.PeriodEnd,
            MeterReadingDate = entity.MeterReadingDate,
            UsageAmount = entity.UsageAmount,
            UsageUnit = entity.UsageUnit,
            SewerUsageAmount = entity.SewerUsageAmount,
            AmountJpy = entity.AmountJpy,
            Breakdown = entity.Breakdown?.ToUtilityBillBreakdown(),
            DueDate = entity.DueDate,
            PaidDate = entity.PaidDate,
            PaymentMethod = Enum.TryParse<UtilityPaymentMethod>(entity.PaymentMethod, out var pm) ? pm : null,
            Status = UtilityBillStatusCalculator.Compute(entity.PaidDate, entity.DueDate),
            ReceiptRef = entity.ReceiptRef,
            Notes = entity.Notes,
            LastModifiedUtc = entity.LastModifiedUtc
        };
    }

    public static UtilityBillEntity ToEntity(this UtilityBill record, string userId)
    {
        return new UtilityBillEntity
        {
            Id = string.IsNullOrEmpty(record.Id) ? Guid.NewGuid().ToString() : record.Id,
            UserId = userId,
            Provider = record.Provider.ToString(),
            BillingYear = record.BillingYear,
            BillingMonth = record.BillingMonth,
            PeriodStart = record.PeriodStart,
            PeriodEnd = record.PeriodEnd,
            MeterReadingDate = record.MeterReadingDate,
            UsageAmount = record.UsageAmount,
            UsageUnit = string.IsNullOrWhiteSpace(record.UsageUnit) ? "m³" : record.UsageUnit,
            SewerUsageAmount = record.SewerUsageAmount,
            AmountJpy = record.AmountJpy,
            Breakdown = record.Breakdown?.ToEntity(),
            DueDate = record.DueDate,
            PaidDate = record.PaidDate,
            PaymentMethod = record.PaymentMethod?.ToString(),
            ReceiptRef = record.ReceiptRef,
            Notes = record.Notes,
            LastModifiedUtc = DateTime.UtcNow
        };
    }

    public static UtilityBillBreakdown ToUtilityBillBreakdown(this UtilityBillBreakdownEntity entity)
    {
        return new UtilityBillBreakdown
        {
            WaterCharge = entity.WaterCharge,
            SewerCharge = entity.SewerCharge,
            ConsumptionTax = entity.ConsumptionTax,
            SlipIssuingFee = entity.SlipIssuingFee,
            LateInterest = entity.LateInterest
        };
    }

    public static UtilityBillBreakdownEntity ToEntity(this UtilityBillBreakdown record)
    {
        return new UtilityBillBreakdownEntity
        {
            WaterCharge = record.WaterCharge,
            SewerCharge = record.SewerCharge,
            ConsumptionTax = record.ConsumptionTax,
            SlipIssuingFee = record.SlipIssuingFee,
            LateInterest = record.LateInterest
        };
    }

    // --- UtilityBillDocumentMeta <-> UtilityBillDocumentEntity ---

    public static UtilityBillDocumentMeta ToMeta(this UtilityBillDocumentEntity entity)
    {
        return new UtilityBillDocumentMeta
        {
            Id = entity.Id,
            UtilityBillId = entity.UtilityBillId,
            FileName = entity.FileName,
            ContentType = entity.ContentType,
            SizeBytes = entity.SizeBytes,
            UploadedUtc = entity.UploadedUtc,
            DriveFileId = entity.DriveFileId,
            DriveWebViewLink = entity.DriveWebViewLink
        };
    }

    // --- UtilityProviderSettings <-> UtilityProviderSettingsEntity ---

    public static UtilityProviderSettings ToUtilityProviderSettings(this UtilityProviderSettingsEntity entity)
    {
        return new UtilityProviderSettings
        {
            Provider = Enum.TryParse<UtilityProvider>(entity.Provider, out var p) ? p : UtilityProvider.TokyoGas,
            CustomerNumber = entity.CustomerNumber,
            CurrentPaymentMethod = Enum.TryParse<UtilityPaymentMethod>(entity.CurrentPaymentMethod, out var pm) ? pm : null,
            PaymentMethodChangedDate = entity.PaymentMethodChangedDate
        };
    }

    public static UtilityProviderSettingsEntity ToEntity(this UtilityProviderSettings record, string userId)
    {
        return new UtilityProviderSettingsEntity
        {
            UserId = userId,
            Provider = record.Provider.ToString(),
            CustomerNumber = record.CustomerNumber,
            CurrentPaymentMethod = record.CurrentPaymentMethod?.ToString(),
            PaymentMethodChangedDate = record.PaymentMethodChangedDate
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
            FontSizePreset = entity.FontSizePreset,
            DateFormat = entity.DateFormat,
            WeekStartDay = entity.WeekStartDay,
            DefaultLandingPage = entity.DefaultLandingPage,
            IdleTimeoutMinutes = entity.IdleTimeoutMinutes,
            NotificationsEnabled = entity.NotificationsEnabled,
            NotificationChannel = entity.NotificationChannel,
            AccentColor = entity.AccentColor,
            GlassIntensity = entity.GlassIntensity
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
            NotificationsEnabled = settings.NotificationsEnabled,
            NotificationChannel = settings.NotificationChannel,
            AccentColor = settings.AccentColor,
            GlassIntensity = settings.GlassIntensity
        };
    }

    // --- NotificationEntity -> AppNotification ---

    public static AppNotification ToDto(this NotificationEntity entity)
    {
        return new AppNotification
        {
            Id = entity.Id,
            Type = entity.Type,
            Title = entity.Title,
            Message = entity.Message,
            Href = entity.Href,
            CreatedUtc = entity.CreatedUtc,
            ReadUtc = entity.ReadUtc
        };
    }

    // --- ResourceEntity -> ResourceMeta ---

    public static ResourceMeta ToMeta(this ResourceEntity entity)
    {
        return new ResourceMeta
        {
            Id = entity.Id,
            Type = entity.Type,
            Title = entity.Title,
            Notes = entity.Notes,
            Url = entity.Url,
            FileName = entity.FileName,
            ContentType = entity.ContentType,
            SizeBytes = entity.SizeBytes,
            DriveFileId = entity.DriveFileId,
            DriveWebViewLink = entity.DriveWebViewLink,
            Tags = entity.Tags,
            Keywords = entity.Keywords,
            CreatedUtc = entity.CreatedUtc,
            LastModifiedUtc = entity.LastModifiedUtc
        };
    }
}
