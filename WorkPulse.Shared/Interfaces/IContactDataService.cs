using System.Threading.Tasks;
using WorkPulse.Models;

namespace WorkPulse.Services;

public interface IContactDataService
{
    Task<ContactBookData> LoadContactsAsync();
    Task SaveContactsAsync(ContactBookData data);
}
