using System.Collections.Generic;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface IWeeklyReportDataService
{
    Task<List<WeeklyReport>> LoadAllAsync();
    Task SaveAllAsync(List<WeeklyReport> reports);
}
