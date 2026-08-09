using System.Collections.Generic;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface IDailyReportDataService
{
    Task<List<DailyReport>> LoadAllAsync();
    Task SaveAllAsync(List<DailyReport> reports);
}
