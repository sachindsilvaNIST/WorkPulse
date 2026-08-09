using System.Collections.Generic;
using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface IQuickLinkDataService
{
    Task<List<QuickLink>> LoadAllAsync();
    Task SaveAllAsync(List<QuickLink> links);
}
