document.addEventListener('DOMContentLoaded', function() {
    const tagline = document.querySelector('.tagline');
    if (!tagline) return;

    // Extract roles from the existing HTML to ensure consistency
    const roleSpans = tagline.querySelectorAll('span[property="schema:jobTitle"]');
    let roles = [];
    if (roleSpans.length > 0) {
        roleSpans.forEach(span => roles.push(span.textContent.trim()));
    } else {
        // Fallback if structure changes
        roles = [
            "دانشجوی مهندسی پزشکی",
            "توسعه‌دهنده فول‌استک",
            "استراتژیست برند شخصی"
        ];
    }

    // Hide original content visually but keep for SEO
    const originalContent = document.createElement('span');
    originalContent.className = 'visually-hidden-seo';
    while (tagline.firstChild) {
        originalContent.appendChild(tagline.firstChild);
    }
    tagline.appendChild(originalContent);

    // Create typing wrapper
    const typingWrapper = document.createElement('span');
    typingWrapper.className = 'typing-wrapper';
    typingWrapper.innerHTML = '<span class="typing-text"></span><span class="cursor">|</span>';
    tagline.appendChild(typingWrapper);

    const typeSpan = typingWrapper.querySelector('.typing-text');
    
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function type() {
        const currentRole = roles[roleIndex];
        
        if (isDeleting) {
            typeSpan.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 50;
        } else {
            typeSpan.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 100;
        }

        if (!isDeleting && charIndex === currentRole.length) {
            isDeleting = true;
            typeSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            roleIndex = (roleIndex + 1) % roles.length;
            typeSpeed = 500; // Pause before typing next
        }

        setTimeout(type, typeSpeed);
    }

    // Start typing
    setTimeout(type, 1000);
});
