document.addEventListener('DOMContentLoaded', () => {
    const themeLink = document.getElementById('dynamic-theme');
    const skinButtons = document.querySelectorAll('.skin-btn');
    const toggleBtn = document.getElementById('theme-toggle-btn');
    const panel = document.querySelector('.theme-panel');

    // Toggle the panel slide-in
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('active');
    });

    // Switch Theme logic
    skinButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const fileName = btn.getAttribute('data-file');
            
            // 1. Swap the stylesheet file path
            themeLink.href = `css/skins/${fileName}`;
            
            // 2. Extract the new color name (e.g., "yellow")
            const parts = fileName.split('-');
            if (parts.length > 1) {
                const colorName = parts[1].replace('.css', '');
                const newClass = `demo-${colorName}`;
    
                // --- THE FIX ---
                // Remove any existing demo classes without touching 'dark' or 'light'
                Array.from(document.body.classList).forEach(cls => {
                    if (cls.startsWith('demo-')) {
                        document.body.classList.remove(cls);
                    }
                });
    
                // Add the new demo class
                document.body.classList.add(newClass);
            }
    
            console.log(`Switched to session skin: ${fileName}`);
        });
    });
});

window.addEventListener('load', () => {
    setTimeout(() => {
        document.getElementById('theme-switcher').classList.remove('opacity-0');
    }, 2000);
    
});