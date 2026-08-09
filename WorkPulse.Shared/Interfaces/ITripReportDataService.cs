using System.Collections.Generic;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface ITripReportDataService
{
    Task<List<TripReport>> LoadAllAsync();
    Task SaveAllAsync(List<TripReport> reports);
}
