using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace WorkPulse.Models;

/// <summary>The Settlement phase's header fields plus its two line-item tables — filled in after
/// the trip once actual costs are known. One per TripReport, created lazily on first save.</summary>
public class TripSettlement
{
    public string TripReportId { get; set; } = "";
    public string EmployeeNo { get; set; } = "";
    public string BankAccountNumber { get; set; } = "";
    public string Bank { get; set; } = "";
    public string Branch { get; set; } = "";
    public string LocationAtSettlement { get; set; } = "";
    public string Region { get; set; } = "";
    public string AccountingCode { get; set; } = "";
    public string SourceDocumentNo { get; set; } = "";
    public List<TripSettlementTransportationLine> TransportationLines { get; set; } = new();
    public List<TripSettlementOtherLine> OtherLines { get; set; } = new();

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public DateTime LastModifiedUtc { get; set; }

    [JsonIgnore]
    public decimal SettlementTotal =>
        TransportationLines.Sum(l => l.LineTotal) + OtherLines.Sum(l => l.SettlementAmount);
}
