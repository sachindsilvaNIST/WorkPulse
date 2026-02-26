using System.Threading.Tasks;
using NistAttendance.Models;

namespace NistAttendance.Services;

public interface IContactDataService
{
    Task<ContactBookData> LoadContactsAsync();
    Task SaveContactsAsync(ContactBookData data);
}
