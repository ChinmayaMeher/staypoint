document.addEventListener('DOMContentLoaded', () => {
  const markReadBtns = document.querySelectorAll('.mark-read-btn');
  const markAllBtn = document.getElementById('markAllReadBtn');
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

  const headers = {
    'Content-Type': 'application/json'
  };
  if (csrfToken) {
    headers['CSRF-Token'] = csrfToken;
  }

  // Mark single notification as read
  markReadBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      const item = document.querySelector(`.notification-item[data-id="${id}"]`);
      
      try {
        const res = await fetch(`/notifications/${id}/read`, {
          method: 'PATCH',
          headers
        });
        
        if (res.ok) {
          // Update UI
          item.classList.remove('unread');
          item.classList.add('read');
          item.style.opacity = '0.7';
          item.style.borderLeft = 'none';
          item.style.boxShadow = 'none';
          btn.remove(); // Remove the checkmark button
          
          updateBadgeCount();
        }
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    });
  });

  // Mark all as read
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const res = await fetch('/notifications/mark-all-read', {
          method: 'POST',
          headers
        });
        
        if (res.ok) {
          document.querySelectorAll('.notification-item.unread').forEach(item => {
            item.classList.remove('unread');
            item.classList.add('read');
            item.style.opacity = '0.7';
            item.style.borderLeft = 'none';
            item.style.boxShadow = 'none';
          });
          document.querySelectorAll('.mark-read-btn').forEach(b => b.remove());
          markAllBtn.remove();
          
          updateBadgeCount(true);
        }
      } catch (err) {
        console.error('Failed to mark all read', err);
      }
    });
  }

  function updateBadgeCount(clearAll = false) {
    const badges = document.querySelectorAll('.fa-bell + span, a[href="/notifications"] span');
    badges.forEach(badge => {
      if (clearAll) {
        badge.remove();
      } else {
        let count = parseInt(badge.textContent);
        if (count > 1) {
          badge.textContent = count - 1;
        } else {
          badge.remove();
        }
      }
    });
  }
});
