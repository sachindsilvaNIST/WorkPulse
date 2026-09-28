namespace WorkPulse.Api.Data.Entities;

/// <summary>One row of the Settlement's per-day transportation & travel expense table. Embedded
/// inside TripSettlementEntity.TransportationLines — no longer a top-level collection.</summary>
public class TripSettlementTransportationLineEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateOnly? Date { get; set; }
    public string Content { get; set; } = "";
    public string DestinationName { get; set; } = "";
    public string PlaceName { get; set; } = "";
    public string Route { get; set; } = "";
    public string TransportMode { get; set; } = "";
    public string DepartureTime { get; set; } = "";
    public string ArrivalTime { get; set; } = "";
    public decimal? GasCost { get; set; }
    public decimal? TollCost { get; set; }
    public decimal TransportationCost { get; set; }
    public decimal LodgingCost { get; set; }
    public decimal DailyAllowance { get; set; }
}
