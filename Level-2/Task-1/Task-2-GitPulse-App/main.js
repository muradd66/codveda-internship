const usernameInput = document.getElementById('usernameInput');
const searchBtn = document.getElementById('searchBtn');
const interactiveLoader = document.getElementById('interactiveLoader');
const loaderMessage = document.getElementById('loaderMessage');
const inlineLoader = document.getElementById('inlineLoader');
const errorPanel = document.getElementById('errorPanel');
const errorText = document.getElementById('errorText');
const realDataContainer = document.getElementById('realDataContainer');

const dynamicPhrases = [
    "📡 Establishing secure connection to GitHub API...",
    "🔍 Scanning GitScope database pipelines...",
    "🧠 Extracting developer profile telemetry...",
    "⚡ Optimizing analytics interface layout...",
    "🟢 System status: Nominal. Ready for query."
];

let phraseIndex = 0;

function rotateLoaderText() {
    phraseIndex = (phraseIndex + 1) % dynamicPhrases.length;
    loaderMessage.textContent = dynamicPhrases[phraseIndex];
}

const textTimer = setInterval(rotateLoaderText, 2500);

function updateUIState(state) {
    if (state === 'loading') {
        inlineLoader.classList.add('active');
        errorPanel.style.display = 'none';
    } else if (state === 'error') {
        inlineLoader.classList.remove('active');
        interactiveLoader.style.display = 'none';
        realDataContainer.className = 'profile-card data-hidden';
        errorPanel.style.display = 'flex';
    } else {
        inlineLoader.classList.remove('active');
        interactiveLoader.style.display = 'none';
        errorPanel.style.display = 'none';
        realDataContainer.className = 'profile-card data-visible';
    }
}

function resetUI() {
    inlineLoader.classList.remove('active');
    interactiveLoader.style.display = 'block';
    errorPanel.style.display = 'none';
    realDataContainer.className = 'profile-card data-hidden';
    realDataContainer.innerHTML = '';
}

async function executePulseSearch() {
    const query = usernameInput.value.trim();

    if (!query) {
        resetUI();
        return;
    }

    updateUIState('loading');

    try {
        const userResponse = await fetch(`https://api.github.com/users/${query}`);

        if (!userResponse.ok) {
            if (userResponse.status === 404) {
                errorText.textContent = `The handle "${query}" does not match any active GitHub account logs.`;
            } else {
                errorText.textContent = `API pipeline exception encountered. Status code: ${userResponse.status}`;
            }
            updateUIState('error');
            return;
        }

        const userData = await userResponse.json();
        
        const reposResponse = await fetch(`https://api.github.com/users/${query}/repos?sort=updated&per_page=5`);
        const reposData = reposResponse.ok ? await reposResponse.json() : [];

        buildAndRenderDOM(userData, reposData);
        updateUIState('success');

    } catch (networkException) {
        errorText.textContent = "Fatal handshake failure. Please check your network link.";
        updateUIState('error');
    }
}

function buildAndRenderDOM(user, repos) {
    realDataContainer.innerHTML = '';

    const metaBlock = document.createElement('div');
    metaBlock.className = 'profile-meta-block';

    const avatar = document.createElement('img');
    avatar.className = 'avatar-frame';
    avatar.src = user.avatar_url;
    avatar.alt = user.login;

    const identityWrapper = document.createElement('div');
    identityWrapper.className = 'profile-identity';

    const nameHeading = document.createElement('h2');
    const nameLink = document.createElement('a');
    nameLink.href = user.html_url;
    nameLink.target = '_blank';
    nameLink.textContent = user.name || user.login;
    nameHeading.append(nameLink);

    const aliasDiv = document.createElement('div');
    aliasDiv.className = 'username-alias';
    aliasDiv.textContent = `@${user.login}`;

    const dateConfig = { year: 'numeric', month: 'short', day: 'numeric' };
    const parsedDate = new Date(user.created_at).toLocaleDateString('en-US', dateConfig);
    const joinedDiv = document.createElement('div');
    joinedDiv.className = 'joined-date';
    joinedDiv.textContent = `Joined ${parsedDate}`;

    identityWrapper.append(nameHeading, aliasDiv, joinedDiv);
    metaBlock.append(avatar, identityWrapper);

    const bioParagraph = document.createElement('p');
    bioParagraph.className = 'bio-text';
    bioParagraph.textContent = user.bio || "This operational nexus profile has left the bio metrics empty.";

    const statsMesh = document.createElement('div');
    statsMesh.className = 'stats-mesh';

    const statFields = [
        { label: 'Repos', value: user.public_repos },
        { label: 'Followers', value: user.followers },
        { label: 'Following', value: user.following }
    ];

    statFields.forEach(field => {
        const node = document.createElement('div');
        node.className = 'mesh-node';
        const h4 = document.createElement('h4');
        h4.textContent = field.label;
        const span = document.createElement('span');
        span.textContent = field.value;
        node.append(h4, span);
        statsMesh.append(node);
    });

    const anchorsLayout = document.createElement('div');
    anchorsLayout.className = 'anchors-layout';

    const anchorData = [
        { icon: 'fa-location-dot', text: user.location || "Not Anchored", type: 'text' },
        { icon: 'fa-link', text: user.blog ? user.blog.replace(/^(https?:\/\/)?(www\.)?/, '') : "No Endpoint", type: 'link', url: user.blog },
        { icon: 'fa-brands fa-x-twitter', text: user.twitter_username ? `@${user.twitter_username}` : "No Stream", type: 'text' },
        { icon: 'fa-solid fa-building', text: user.company || "Independent Entity", type: 'text' }
    ];

    anchorData.forEach(item => {
        let node;
        if (item.type === 'link' && item.url) {
            node = document.createElement('a');
            node.href = item.url.startsWith('http') ? item.url : `https://${item.url}`;
            node.target = '_blank';
            node.className = 'anchor-node valid-link';
        } else {
            node = document.createElement('div');
            node.className = item.type === 'link' ? 'anchor-node text-disabled' : 'anchor-node';
        }

        const icon = document.createElement('i');
        icon.className = item.icon.startsWith('fa-') ? `fa-solid ${item.icon}` : item.icon;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = item.text;

        node.append(icon, textSpan);
        anchorsLayout.append(node);
    });

    realDataContainer.append(metaBlock, bioParagraph, statsMesh, anchorsLayout);

    if (repos.length > 0) {
        const reposSectionTitle = document.createElement('h3');
        reposSectionTitle.className = 'repos-section-title';
        
        const titleIcon = document.createElement('i');
        titleIcon.className = 'fa-solid fa-code-branch';
        reposSectionTitle.append(titleIcon, document.createTextNode(' Active Repositories'));

        const reposList = document.createElement('div');
        reposList.className = 'repos-list';

        repos.forEach(repo => {
            const repoCard = document.createElement('div');
            repoCard.className = 'repo-item-card';

            const cardTop = document.createElement('div');
            cardTop.className = 'repo-card-top';

            const repoLink = document.createElement('a');
            repoLink.className = 'repo-link';
            repoLink.href = repo.html_url;
            repoLink.target = '_blank';
            repoLink.textContent = repo.name;

            const badge = document.createElement('span');
            badge.className = 'repo-visibility-badge';
            badge.textContent = repo.private ? 'Private' : 'Public';

            cardTop.append(repoLink, badge);

            const desc = document.createElement('p');
            desc.className = 'repo-card-desc';
            desc.textContent = repo.description || "No operational description logs provided for this repository.";

            const cardMeta = document.createElement('div');
            cardMeta.className = 'repo-card-meta';

            if (repo.language) {
                const langWrapper = document.createElement('div');
                langWrapper.className = 'repo-lang-wrapper';

                const langDot = document.createElement('div');
                langDot.className = 'repo-lang-dot';
                
                if (repo.language === 'JavaScript') langDot.style.backgroundColor = '#f1e05a';
                else if (repo.language === 'Python') langDot.style.backgroundColor = '#3572a5';
                else if (repo.language === 'HTML') langDot.style.backgroundColor = '#e34c26';
                else if (repo.language === 'CSS') langDot.style.backgroundColor = '#563d7c';
                else if (repo.language === 'TypeScript') langDot.style.backgroundColor = '#3178c6';

                const langText = document.createElement('span');
                langText.textContent = repo.language;

                langWrapper.append(langDot, langText);
                cardMeta.append(langWrapper);
            }

            const stars = document.createElement('span');
            const starIcon = document.createElement('i');
            starIcon.className = 'fa-regular fa-star';
            stars.append(starIcon, document.createTextNode(` ${repo.stargazers_count}`));

            const forks = document.createElement('span');
            const forkIcon = document.createElement('i');
            forkIcon.className = 'fa-solid fa-code-fork';
            forks.append(forkIcon, document.createTextNode(` ${repo.forks_count}`));

            cardMeta.append(stars, forks);
            repoCard.append(cardTop, desc, cardMeta);
            reposList.append(repoCard);
        });

        realDataContainer.append(reposSectionTitle, reposList);
    }
}

searchBtn.addEventListener('click', executePulseSearch);

usernameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        executePulseSearch();
    }
});

usernameInput.addEventListener('input', () => {
    if (usernameInput.value.trim() === '') {
        resetUI();
    }
});