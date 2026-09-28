namespace WorkPulse.Api.Data.Entities;

/// <summary>One per trip (created lazily on first save) — the Settlement phase's header fields,
/// filled in after the trip once actual costs are known. Embedded inside TripReportEntity.Settlement
/// (a single owned sub-document, not a collection) — no longer a top-level collection; its own line
/// items (TransportationLines/OtherLines) are embedded arrays nested one level further in.</summary>
public class TripSettlementEntity
{
    public string EmployeeNo { get; set; } = "";
    public string BankAccountNumber { get; set; } = "";
    public string Bank { get; set; } = "";
    public string Branch { get; set; } = "";
    public string LocationAtSettlement { get; set; } = "";
    public string Region { get; set; } = "";
    public string AccountingCode { get; set; } = "";
    public string SourceDocumentNo { get; set; } = "";
    public DateTime LastModifiedUtc { get; set; } = DateTime.UtcNow;

    public ICollection<TripSettlementTransportationLineEntity> TransportationLines { get; set; } = new List<TripSettlementTransportationLineEntity>();
    public ICollection<TripSettlementOtherLineEntity> OtherLines { get; set; } = new List<TripSettlementOtherLineEntity>();
}
