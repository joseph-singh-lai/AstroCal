import { DEFAULT_CATEGORIES } from './config.js';
import {
    loadingProgress,
    loadingProgressContainer,
    loadingProgressFill,
    loadingProgressText,
    triggerApplyFilters
} from './state.js';
import { debounce, escapeRegExp } from './utils.js';

export function showLoadingProgress() {
    if (loadingProgressContainer) {
        loadingProgressContainer.style.display = 'block';
        updateLoadingProgressDisplay();
    }
}

export function hideLoadingProgress() {
    if (loadingProgressContainer) {
        setTimeout(() => {
            if (loadingProgressContainer) {
                loadingProgressContainer.style.display = 'none';
            }
        }, 500);
    }
}

export function updateLoadingProgress(taskName) {
    if (!Object.prototype.hasOwnProperty.call(loadingProgress.tasks, taskName)) {
        return;
    }

    if (!loadingProgress.tasks[taskName]) {
        loadingProgress.tasks[taskName] = true;
        loadingProgress.completed++;
        updateLoadingProgressDisplay();
    }
}

export function updateLoadingProgressDisplay() {
    if (!loadingProgressFill || !loadingProgressText) {
        return;
    }

    const percentage = Math.round((loadingProgress.completed / loadingProgress.total) * 100);
    loadingProgressFill.style.width = `${percentage}%`;

    if (loadingProgress.completed === loadingProgress.total) {
        loadingProgressText.textContent = 'Loading complete!';
    } else {
        loadingProgressText.textContent = `Loading events... (${loadingProgress.completed}/${loadingProgress.total})`;
    }
}

export function resetLoadingProgress() {
    loadingProgress.completed = 0;
    Object.keys(loadingProgress.tasks).forEach(key => {
        loadingProgress.tasks[key] = false;
    });
}

export function setupHeaderScroll() {
    const header = document.getElementById('mainHeader');
    if (!header) return;

    const CONDENSE_AT = 100;
    const EXPAND_AT = 20;
    let isCondensed = header.classList.contains('condensed');
    let ticking = false;

    const handleScroll = () => {
        const scrollY = window.scrollY;

        if (!isCondensed && scrollY > CONDENSE_AT) {
            isCondensed = true;
            header.classList.add('condensed');
        } else if (isCondensed && scrollY < EXPAND_AT) {
            isCondensed = false;
            header.classList.remove('condensed');
        }

        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(handleScroll);
            ticking = true;
        }
    }, { passive: true });

    handleScroll();
}

export function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

export function setupMotionToggle() {
    const motionToggle = document.getElementById('motionToggle');
    if (!motionToggle) return;

    document.body.classList.remove('reduce-motion');

    const savedMotionPref = localStorage.getItem('reduceMotion');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (savedMotionPref === 'true' || (savedMotionPref === null && prefersReduced)) {
        document.body.classList.add('reduce-motion');
    } else if (savedMotionPref === 'false') {
        localStorage.setItem('reduceMotion', 'false');
    }

    motionToggle.addEventListener('click', () => {
        document.body.classList.toggle('reduce-motion');
        const isReduced = document.body.classList.contains('reduce-motion');
        localStorage.setItem('reduceMotion', isReduced.toString());
        announceToScreenReader(isReduced ? 'Background animations paused' : 'Background animations resumed');
    });
}

export function setupFilterPanel() {
    const filterPanel = document.getElementById('filterPanel');
    const filterToggleMobile = document.getElementById('filterToggleMobile');
    const filterCloseMobile = document.getElementById('filterCloseMobile');
    const selectAllBtn = document.getElementById('selectAllFilters');
    const clearAllBtn = document.getElementById('clearAllFilters');

    let lastFilterTrigger = null;

    if (filterToggleMobile && filterPanel) {
        filterToggleMobile.addEventListener('click', () => {
            lastFilterTrigger = filterToggleMobile;
            filterPanel.classList.add('open');
            document.body.style.overflow = 'hidden';
            const firstFocusable = filterPanel.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) firstFocusable.focus();
        });
    }

    if (filterCloseMobile && filterPanel) {
        filterCloseMobile.addEventListener('click', () => {
            filterPanel.classList.remove('open');
            document.body.style.overflow = '';
            if (lastFilterTrigger) lastFilterTrigger.focus();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && filterPanel && filterPanel.classList.contains('open')) {
            filterPanel.classList.remove('open');
            document.body.style.overflow = '';
            if (lastFilterTrigger) lastFilterTrigger.focus();
        }
        if (e.key === 'Tab' && filterPanel && filterPanel.classList.contains('open')) {
            const focusables = filterPanel.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.filter-checkbox input[type="checkbox"]').forEach(cb => {
                cb.checked = true;
            });
            updateFilterCount();
            triggerApplyFilters();
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.filter-checkbox input[type="checkbox"]').forEach(cb => {
                cb.checked = DEFAULT_CATEGORIES.includes(cb.value);
            });
            updateFilterCount();
            triggerApplyFilters();
        });
    }

    document.querySelectorAll('.filter-checkbox input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateFilterCount);
    });
}

export function updateFilterCount() {
    const filterCount = document.getElementById('filterCount');
    if (!filterCount) return;

    const checkedCount = document.querySelectorAll('.filter-checkbox input[type="checkbox"]:checked').length;
    filterCount.textContent = checkedCount;

    if (checkedCount > 3) {
        filterCount.style.background = 'var(--accent-secondary)';
    } else {
        filterCount.style.background = 'var(--accent-primary)';
    }
}

export function setupOnboardingBanner() {
    const banner = document.getElementById('onboardingBanner');
    const dismiss = document.getElementById('onboardingDismiss');
    if (!banner || !dismiss) return;

    if (localStorage.getItem('onboardingDismissed') === 'true') {
        banner.hidden = true;
        return;
    }

    banner.hidden = false;
    dismiss.addEventListener('click', () => {
        banner.hidden = true;
        localStorage.setItem('onboardingDismissed', 'true');
    });
}

function highlightSearchTerm(item, searchTerm) {
    const strongEl = item.querySelector('strong');
    const pEl = item.querySelector('p');

    if (strongEl) {
        strongEl.innerHTML = strongEl.textContent;
    }
    if (pEl) {
        pEl.innerHTML = pEl.textContent;
    }

    if (searchTerm && searchTerm.length > 1) {
        const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');

        if (strongEl && strongEl.textContent.toLowerCase().includes(searchTerm)) {
            strongEl.innerHTML = strongEl.textContent.replace(regex, '<mark style="background: var(--accent-warning); color: var(--bg-primary); padding: 0 2px; border-radius: 2px;">$1</mark>');
        }
        if (pEl && pEl.textContent.toLowerCase().includes(searchTerm)) {
            pEl.innerHTML = pEl.textContent.replace(regex, '<mark style="background: var(--accent-warning); color: var(--bg-primary); padding: 0 2px; border-radius: 2px;">$1</mark>');
        }
    }
}

export function setupGlossarySearch() {
    const glossarySearch = document.getElementById('glossarySearch');
    if (!glossarySearch) return;

    glossarySearch.addEventListener('input', debounce((e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const glossaryItems = document.querySelectorAll('.glossary-item');
        const glossaryCategories = document.querySelectorAll('.glossary-category');

        if (!searchTerm) {
            glossaryItems.forEach(item => { item.style.display = ''; });
            glossaryCategories.forEach(cat => { cat.style.display = ''; });
            return;
        }

        glossaryItems.forEach(item => {
            const term = item.querySelector('strong')?.textContent.toLowerCase() || '';
            const definition = item.querySelector('p')?.textContent.toLowerCase() || '';

            if (term.includes(searchTerm) || definition.includes(searchTerm)) {
                item.style.display = '';
                highlightSearchTerm(item, searchTerm);
            } else {
                item.style.display = 'none';
            }
        });

        glossaryCategories.forEach(cat => {
            const visibleItems = cat.querySelectorAll('.glossary-item:not([style*="display: none"])');
            cat.style.display = visibleItems.length === 0 ? 'none' : '';
        });
    }, 200));
}
