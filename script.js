document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.liquid-header');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const mobileDrawer = document.querySelector('.mobile-drawer');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    const parseRgb = (color) => {
        const match = color && color.match(/rgba?\(([^)]+)\)/i);
        if (!match) {
            return null;
        }

        const values = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
        return {
            r: values[0] || 0,
            g: values[1] || 0,
            b: values[2] || 0,
            a: values.length > 3 ? values[3] : 1
        };
    };

    const relativeLuminance = ({ r, g, b }) => {
        const toLinear = (channel) => {
            const normalized = channel / 255;
            if (normalized <= 0.03928) {
                return normalized / 12.92;
            }

            return ((normalized + 0.055) / 1.055) ** 2.4;
        };

        const lr = toLinear(r);
        const lg = toLinear(g);
        const lb = toLinear(b);
        return (0.2126 * lr) + (0.7152 * lg) + (0.0722 * lb);
    };

    const getVisibleBackground = (element) => {
        let current = element;
        while (current && current !== document.body) {
            const bg = parseRgb(window.getComputedStyle(current).backgroundColor);
            if (bg && bg.a > 0.02) {
                return bg;
            }
            current = current.parentElement;
        }

        const bodyBg = parseRgb(window.getComputedStyle(document.body).backgroundColor);
        return bodyBg || { r: 245, g: 241, b: 235, a: 1 };
    };

    const updateHeaderTone = () => {
        if (!header) {
            return;
        }

        header.classList.add('is-embedded');
        header.classList.remove('is-solid');

        const headerRect = header.getBoundingClientRect();
        const probeX = Math.max(1, Math.min(window.innerWidth - 1, window.innerWidth / 2));
        const probeY = Math.max(1, Math.min(window.innerHeight - 1, headerRect.bottom + 10));

        const sampleNode = document.elementFromPoint(probeX, probeY);
        const sampleTarget = sampleNode ? sampleNode.closest('section, footer, body') || sampleNode : document.body;
        const background = getVisibleBackground(sampleTarget);
        const luminance = relativeLuminance(background);

        const toneClass = luminance < 0.26 ? 'header-tone-light' : 'header-tone-dark';
        header.classList.toggle('header-tone-light', toneClass === 'header-tone-light');
        header.classList.toggle('header-tone-dark', toneClass === 'header-tone-dark');
    };

    const closeDrawer = () => {
        if (!header || !mobileToggle) {
            return;
        }

        header.classList.remove('is-open');
        mobileToggle.setAttribute('aria-expanded', 'false');
    };

    if (mobileToggle && header && mobileDrawer) {
        mobileToggle.addEventListener('click', () => {
            const isOpen = header.classList.toggle('is-open');
            mobileToggle.setAttribute('aria-expanded', String(isOpen));
        });

        mobileDrawer.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeDrawer);
        });

        document.addEventListener('click', (event) => {
            const clickedInsideHeader = header.contains(event.target);
            if (!clickedInsideHeader) {
                closeDrawer();
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 860) {
                closeDrawer();
            }
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function onAnchorClick(event) {
            const targetSelector = this.getAttribute('href');
            if (!targetSelector) {
                return;
            }

            const target = document.querySelector(targetSelector);
            if (!target) {
                return;
            }

            event.preventDefault();
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        });
    });

    const allSections = Array.from(document.querySelectorAll('section[id]'));
    const navLinks = Array.from(document.querySelectorAll('.nav-links a'));
    const drawerLinks = Array.from(document.querySelectorAll('.mobile-drawer a')).filter((link) => !link.classList.contains('drawer-cta'));
    const headerCta = document.querySelector('.get-in-touch');
    const trackedLinks = [...navLinks, ...drawerLinks];
    const trackedIds = navLinks
        .map((link) => link.getAttribute('href'))
        .filter((href) => typeof href === 'string' && href.startsWith('#'))
        .map((href) => href.slice(1));
    const trackedIdSet = new Set(trackedIds);

    const updateActiveNav = () => {
        if (!allSections.length || !trackedLinks.length) {
            return;
        }

        const header = document.querySelector('.liquid-header');
        const threshold = (header ? header.offsetHeight : 96) + 20;
        const marker = window.scrollY + threshold;
        let currentSection = '';
        let visibleSection = '';

        allSections.forEach((section) => {
            const start = section.offsetTop;
            const end = start + section.offsetHeight;
            if (marker >= start && marker < end) {
                visibleSection = section.id;
                if (trackedIdSet.has(section.id)) {
                    currentSection = section.id;
                } else {
                    currentSection = '';
                }
            }
        });

        const reachedPageBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (!visibleSection && reachedPageBottom && allSections.length) {
            visibleSection = allSections[allSections.length - 1].id;
        }

        navLinks.forEach((link) => {
            const isCurrent = link.getAttribute('href') === `#${currentSection}`;
            link.classList.toggle('active', Boolean(isCurrent));
        });

        drawerLinks.forEach((link) => {
            const isCurrent = link.getAttribute('href') === `#${currentSection}`;
            link.classList.toggle('active', Boolean(isCurrent));
        });

        if (headerCta) {
            headerCta.classList.toggle('active', visibleSection === 'contact');
        }
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

    const runFallbackReveal = () => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry, index) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 90);
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }
        );

        document.querySelectorAll('.project-card, .experience-item, .skill-category').forEach((element) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            observer.observe(element);
        });
    };

    const initGsapExperience = () => {
        const gsap = window.gsap;
        const ScrollTrigger = window.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);

        const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
        heroTimeline
            .from('.portfolio-title', { y: 34, opacity: 0, duration: 0.9 })
            .from('.portfolio-subtitle', { y: 26, opacity: 0, duration: 0.65 }, '-=0.55')
            .from('.hero-description', { y: 20, opacity: 0, duration: 0.6 }, '-=0.45')
            .from('.social-badge', { y: 20, opacity: 0, stagger: 0.12, duration: 0.55 }, '-=0.45')
            .from('.hero-image', { scale: 0.92, rotate: -2, opacity: 0, duration: 0.9 }, '-=0.8');

        gsap.utils.toArray('.floating-star').forEach((star, index) => {
            const direction = index % 2 === 0 ? -1 : 1;
            gsap.to(star, {
                y: 120 * direction,
                rotation: 160 * direction,
                ease: 'none',
                scrollTrigger: {
                    trigger: '.hero',
                    start: 'top top',
                    end: 'bottom top',
                    scrub: 0.8
                }
            });
        });

        gsap.to('.hero-image', {
            y: -70,
            rotate: 2,
            ease: 'none',
            scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1.1
            }
        });

        gsap.utils.toArray('.about-content, .experience-item, .skill-category, .thank-you .container').forEach((element) => {
            gsap.from(element, {
                y: 44,
                opacity: 0,
                filter: 'blur(8px)',
                duration: 0.95,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: element,
                    start: 'top 84%',
                    once: true
                }
            });
        });

        gsap.from('.section-title', {
            letterSpacing: '0.25em',
            opacity: 0,
            duration: 0.85,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '.projects',
                start: 'top 78%',
                once: true
            }
        });

        gsap.from('.project-card', {
            y: 60,
            opacity: 0,
            scale: 0.94,
            rotate: 0.6,
            stagger: 0.12,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: '.projects-grid',
                start: 'top 82%',
                once: true
            }
        });

        gsap.utils.toArray('.project-card').forEach((card, index) => {
            const direction = index % 2 === 0 ? -1 : 1;
            const image = card.querySelector('.project-image');
            if (!image) {
                return;
            }

            gsap.to(image, {
                yPercent: 14 * direction,
                rotation: 2 * direction,
                ease: 'none',
                scrollTrigger: {
                    trigger: card,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 0.6
                }
            });
        });

        const projectsSection = document.querySelector('.projects');
        const projectsContainer = projectsSection ? projectsSection.querySelector('.container') : null;
        const sectionTitle = projectsSection ? projectsSection.querySelector('.section-title') : null;

        if (projectsSection && projectsContainer && sectionTitle) {
            if (!coarsePointer && window.innerWidth > 968) {
                const signatureMoment = gsap.timeline({
                    scrollTrigger: {
                        trigger: sectionTitle,
                        start: 'top 70%',
                        end: '+=85%',
                        scrub: 0.9,
                        pin: projectsContainer,
                        anticipatePin: 1,
                        invalidateOnRefresh: true
                    }
                });

                signatureMoment
                    .to(projectsSection, {
                        '--spot-opacity': 1,
                        '--spot-x': '78%',
                        '--spot-y': '24%',
                        '--spot-size': '58%',
                        ease: 'power1.inOut',
                        duration: 0.36
                    }, 0)
                    .fromTo(sectionTitle,
                        {
                            scale: 0.96,
                            letterSpacing: '0.02em',
                            y: 18,
                            opacity: 0.85,
                            filter: 'blur(6px)'
                        },
                        {
                            scale: 1.06,
                            y: -8,
                            opacity: 1,
                            filter: 'blur(0px)',
                            letterSpacing: '0.07em',
                            ease: 'power3.out',
                            duration: 0.42
                        },
                        0.08
                    )
                    .to(projectsSection, {
                        '--spot-x': '18%',
                        '--spot-y': '68%',
                        '--spot-size': '64%',
                        ease: 'power1.inOut',
                        duration: 0.4
                    }, 0.38)
                    .to(sectionTitle, {
                        scale: 1,
                        y: 0,
                        letterSpacing: '0.02em',
                        ease: 'power2.out',
                        duration: 0.32
                    }, 0.65)
                    .to(projectsSection, {
                        '--spot-opacity': 0.3,
                        ease: 'power2.out',
                        duration: 0.25
                    }, 0.72);
            } else {
                gsap.to(projectsSection, {
                    '--spot-opacity': 0.48,
                    '--spot-x': '62%',
                    '--spot-y': '28%',
                    '--spot-size': '52%',
                    ease: 'none',
                    scrollTrigger: {
                        trigger: sectionTitle,
                        start: 'top 88%',
                        end: 'top 58%',
                        scrub: 0.6
                    }
                });

                gsap.fromTo(sectionTitle,
                    {
                        y: 20,
                        opacity: 0.8,
                        letterSpacing: '0.02em'
                    },
                    {
                        y: 0,
                        opacity: 1,
                        letterSpacing: '0.05em',
                        duration: 0.7,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: sectionTitle,
                            start: 'top 86%',
                            once: true
                        }
                    }
                );
            }
        }
    };

    const initDisperseText = () => {
        if (coarsePointer || prefersReducedMotion) {
            return;
        }

        const gsap = window.gsap;
        if (!gsap) {
            return;
        }

        const targets = Array.from(document.querySelectorAll('[data-disperse]'));
        targets.forEach((target) => {
            const text = target.textContent;
            if (!text || target.dataset.disperseReady === 'true') {
                return;
            }

            target.dataset.disperseReady = 'true';
            const chars = [...text].map((char) => {
                if (char === ' ') {
                    return '<span class="disperse-char" aria-hidden="true">&nbsp;</span>';
                }
                return `<span class="disperse-char" aria-hidden="true">${char}</span>`;
            }).join('');

            target.setAttribute('aria-label', text);
            target.innerHTML = chars;

            const charNodes = Array.from(target.querySelectorAll('.disperse-char'));
            let rafId = null;

            const disperse = (event) => {
                if (rafId) {
                    cancelAnimationFrame(rafId);
                }

                rafId = requestAnimationFrame(() => {
                    const { clientX, clientY } = event;
                    charNodes.forEach((charNode, index) => {
                        const rect = charNode.getBoundingClientRect();
                        const cx = rect.left + (rect.width / 2);
                        const cy = rect.top + (rect.height / 2);
                        const dx = cx - clientX;
                        const dy = cy - clientY;
                        const distance = Math.sqrt((dx * dx) + (dy * dy)) || 1;
                        const influence = Math.max(0, 1 - (distance / 90));

                        if (influence <= 0) {
                            return;
                        }

                        const push = 18 * influence;
                        gsap.to(charNode, {
                            x: (dx / distance) * push,
                            y: (dy / distance) * push,
                            rotate: (index % 2 === 0 ? 1 : -1) * 9 * influence,
                            opacity: 1 - (0.12 * influence),
                            duration: 0.24,
                            overwrite: true,
                            ease: 'power2.out'
                        });
                    });
                });
            };

            const settle = () => {
                gsap.to(charNodes, {
                    x: 0,
                    y: 0,
                    rotate: 0,
                    opacity: 1,
                    duration: 0.55,
                    stagger: { each: 0.008, from: 'random' },
                    ease: 'elastic.out(1, 0.55)',
                    overwrite: true
                });
            };

            target.addEventListener('mousemove', disperse);
            target.addEventListener('mouseleave', settle);
        });
    };

    if (hasGsap && !prefersReducedMotion) {
        initGsapExperience();
    } else {
        runFallbackReveal();
    }

    let ticking = false;
    const updateOnScroll = () => {
        const scrollTop = window.scrollY;
        const hero = document.querySelector('.hero');
        const heroContent = document.querySelector('.hero-content');

        if (hero && heroContent && scrollTop < hero.offsetHeight) {
            heroContent.style.transform = `translateY(${scrollTop * 0.2}px)`;
        }

        updateHeaderTone();
        updateActiveNav();
        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (ticking) {
            return;
        }

        requestAnimationFrame(updateOnScroll);
        ticking = true;
    });

    const typeWriter = (element, text, speed = 120, onComplete) => {
        if (!element) {
            if (typeof onComplete === 'function') {
                onComplete();
            }
            return;
        }

        let i = 0;
        element.textContent = '';

        const type = () => {
            if (i >= text.length) {
                if (typeof onComplete === 'function') {
                    onComplete();
                }
                return;
            }

            element.textContent += text.charAt(i);
            i += 1;
            setTimeout(type, speed);
        };

        type();
    };

    window.addEventListener('load', () => {
        const heroTitle = document.querySelector('.portfolio-title');
        setTimeout(() => {
            typeWriter(heroTitle, 'PORTFOLIO', 140, () => {
                setTimeout(initDisperseText, 80);
            });
        }, 500);
    });

    if (!document.querySelector('.portfolio-title')) {
        initDisperseText();
    }

    if (themeToggle && themeIcon) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        themeIcon.textContent = document.body.classList.contains('dark-theme') ? '☀' : '◐';

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeIcon.textContent = isDark ? '☀' : '◐';
            updateHeaderTone();
        });
    }

    const openModalBtns = document.querySelectorAll('.open-modal-btn');
    const modal = document.getElementById('modal');
    const modalCloseBtn = document.getElementById('modal-close');

    if (modal && modalCloseBtn && openModalBtns.length) {
        const openModal = () => {
            modal.style.display = 'flex';
        };

        const closeModal = () => {
            modal.style.display = 'none';
        };

        openModalBtns.forEach((btn) => {
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                openModal();
            });
        });

        modalCloseBtn.addEventListener('click', closeModal);

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && modal.style.display === 'flex') {
                closeModal();
            }
        });
    }

    window.addEventListener('resize', updateHeaderTone);
    updateHeaderTone();
    updateActiveNav();
});
