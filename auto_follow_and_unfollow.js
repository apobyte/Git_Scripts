// ==UserScript==
// @name         github follow all users on page (auto next)
// @namespace    http://tampermonkey.net/
// @version      0.2
// @license      MIT License
// @description  follows all users on the current page, clicks Next, and repeats until the last page
// @author       Leonid Fedotov
// @match        https://github.com/*
// @icon         https://www.google.com/s2/favicons?domain=github.com
// ==/UserScript==

(function () {
    'use strict';

    const FLAG = 'gh-follow-all-running';
    const FOLLOW_DELAY = () => 1500 + Math.random() * 1500; // 1.5-3s between follows
    const NEXT_DELAY = 3000;                                // wait before clicking Next

    // Only run on pages that list users (followers / following / stars etc.)
    const listContainer = () => document.querySelector('turbo-frame#user-profile-frame') || document;
    if (document.querySelectorAll('.user-following-container').length === 0) {
        sessionStorage.removeItem(FLAG);
        return;
    }

    const bio = document.querySelector('.js-profile-editable-area .js-user-profile-bio');
    if (!bio) return;

    bio.insertAdjacentHTML(
        'afterend',
        '<div class="mb-3"><button type="button" class="btn btn-block" id="follow-all">Follow all + auto next</button></div>'
    );
    const button = document.getElementById('follow-all');

    function setRunning(running) {
        if (running) {
            sessionStorage.setItem(FLAG, '1');
            button.innerText = 'Running... (click to stop)';
        } else {
            sessionStorage.removeItem(FLAG);
            button.innerText = 'Follow all + auto next';
        }
    }

    const isRunning = () => sessionStorage.getItem(FLAG) === '1';

    // Visible "Follow" buttons inside the user list only (skips the sidebar/profile button)
    function nextFollowButton() {
        return listContainer().querySelector(
            '.js-form-toggle-target:not([hidden]) input[type="submit"][value="Follow"]'
        );
    }

    function nextPageLink() {
        return [...document.querySelectorAll('.paginate-container .pagination a')]
            .find(a => a.textContent.trim() === 'Next' || a.getAttribute('rel') === 'next');
    }

    function followLoop() {
        if (!isRunning()) return;

        const btn = nextFollowButton();
        if (btn) {
            console.log('Following:', btn.title);
            btn.click();
            btn.remove();
            setTimeout(followLoop, FOLLOW_DELAY());
            return;
        }

        // Nothing left to follow on this page -> go to next page
        const next = nextPageLink();
        if (next) {
            console.log('Page done, going to next page...');
            setTimeout(() => {
                if (!isRunning()) return;
                const firstUser = () => {
                    const a = listContainer().querySelector('.user-following-container')
                        ?.closest('.d-table')?.querySelector('a[data-hovercard-type="user"]');
                    return a ? a.getAttribute('href') : null;
                };
                const before = firstUser();
                next.click();

                // GitHub swaps the list in place (Turbo), so the script is not
                // re-run. Wait until the list content changes, then continue.
                let waited = 0;
                const poll = setInterval(() => {
                    waited += 500;
                    if (!isRunning()) return clearInterval(poll);
                    const now = firstUser();
                    if (now && now !== before) {
                        clearInterval(poll);
                        setTimeout(followLoop, 1500);
                    } else if (waited >= 20000) {
                        clearInterval(poll);
                        console.log('Next page did not load in time. Stopped.');
                        setRunning(false);
                    }
                }, 500);
            }, NEXT_DELAY);
        } else {
            console.log('Last page reached. Finished.');
            setRunning(false);
        }
    }

    button.onclick = () => {
        if (isRunning()) {
            setRunning(false);
            console.log('Stopped.');
        } else {
            setRunning(true);
            followLoop();
        }
    };

    // Resume automatically after the page changes
    if (isRunning()) {
        button.innerText = 'Running... (click to stop)';
        setTimeout(followLoop, 2000);
    }
})();
