  const state = {
selectedPapers: new Set(),
isSelectionMode: false,
includeTags: new Set(),
excludeTags: new Set(),
onlyShowSelected: false
};
function debounce(fn, delay) {
let timeout;
return (...args) => {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => fn(...args), delay);
};
}

function updateURL() {
const params = new URLSearchParams();
if (searchInput.value) {
  params.set('search', searchInput.value);
}
if (yearFilter.value !== 'all') {
  params.set('year', yearFilter.value);
}
if (state.includeTags.size > 0) {
  params.set('include', Array.from(state.includeTags).join(','));
}
if (state.excludeTags.size > 0) {
  params.set('exclude', Array.from(state.excludeTags).join(','));
}
if (state.selectedPapers.size > 0) {
  params.set('selected', Array.from(state.selectedPapers).join(','));
  if (state.onlyShowSelected) {
      params.set('show_selected', 'true');
  }
}
const newSearch = params.toString() ? `?${params.toString()}` : '';
window.history.replaceState(
  { filters: params.toString() },
  '',
  `${window.location.pathname}${newSearch}`
);
}

function updatePaperNumbers() {
let num = 1;
document.querySelectorAll('.paper-row.visible').forEach(row => {
  const numElem = row.querySelector('.paper-number');
  numElem.textContent = num++;
});
}
function filterPapers() {
// Show/hide non-paper elements regardless of filter state
document.querySelectorAll('.papers-grid > *').forEach(el => {
  if (!el.classList.contains('paper-row')) {
      el.style.display = 'block'; // Always show headers, donation box, etc.
  }
});

if (state.onlyShowSelected) {
  // When showing only selected papers, hide all non-selected papers
  paperCards.forEach(row => {
      const id = row.getAttribute('data-id');
      row.classList.toggle('visible', state.selectedPapers.has(id));
  });
} else {
  // Normal filtering
  const sTerm = searchInput.value.toLowerCase();
  const selYear = yearFilter.value;
  
  paperCards.forEach(row => {
      const title = row.getAttribute('data-title').toLowerCase();
      const authors = row.getAttribute('data-authors').toLowerCase();
      const year = row.getAttribute('data-year');
      const tags = JSON.parse(row.getAttribute('data-tags'));

      const matchSearch = title.includes(sTerm) || authors.includes(sTerm);
      const matchYear = (selYear === 'all') || (year === selYear);
      const matchInc = (state.includeTags.size === 0) || [...state.includeTags].every(t => tags.includes(t));
      const matchExc = (state.excludeTags.size === 0) || ![...state.excludeTags].some(t => tags.includes(t));

      const visible = matchSearch && matchYear && matchInc && matchExc;
      row.classList.toggle('visible', visible);
  });
}

updatePaperNumbers();
lazyLoadInstance.update();
updateURL();
}

function clearSearch() {
searchInput.value = '';
filterPapers();
}

function initializeFilters() {
// Tag filter clicks
tagFilters.forEach(tagFilter => {
  tagFilter.addEventListener('click', () => {
      const tag = tagFilter.getAttribute('data-tag');
      if (!tagFilter.classList.contains('include') && !tagFilter.classList.contains('exclude')) {
          tagFilter.classList.add('include');
          state.includeTags.add(tag);
      } else if (tagFilter.classList.contains('include')) {
          tagFilter.classList.remove('include');
          tagFilter.classList.add('exclude');
          state.includeTags.delete(tag);
          state.excludeTags.add(tag);
      } else {
          tagFilter.classList.remove('exclude');
          state.excludeTags.delete(tag);
      }
      filterPapers();
  });
});

// Search input
searchInput.addEventListener('input', debounce(filterPapers, 150));

// Year filter
yearFilter.addEventListener('change', filterPapers);
}
function toggleSelectedOnly() {
state.onlyShowSelected = !state.onlyShowSelected;
const button = document.querySelector('.preview-header-right .control-button.show-selected');

if (button) {
  button.innerHTML = state.onlyShowSelected ? 
      '<i class="fas fa-list"></i> Show All Papers' :
      '<i class="fas fa-filter"></i> Show Selected Only';
}

// Update the URL first
const url = new URL(window.location.href);
if (state.onlyShowSelected) {
  url.searchParams.set('show_selected', 'true');
} else {
  url.searchParams.delete('show_selected');
}
window.history.replaceState({}, '', url.toString());

// Then update the display
filterPapers();
}

function toggleSelectionMode() {
state.isSelectionMode = !state.isSelectionMode;
document.body.classList.toggle('selection-mode', state.isSelectionMode);

// Update toggle button icon and tooltip
const toggleButton = document.querySelector('.selection-mode-toggle');
if (toggleButton) {
  toggleButton.innerHTML = state.isSelectionMode ? 
      `<i class="fas fa-times"></i><span class="tooltip">Exit Selection Mode</span>` :
      `<i class="fas fa-list-check"></i><span class="tooltip">Enter Selection Mode</span>`;
}

// Handle visibility and selection display
if (!state.isSelectionMode) {
  if (state.onlyShowSelected) {
      state.onlyShowSelected = false;
      const button = document.querySelector('.preview-header-right .control-button.show-selected');
      if (button) {
          button.innerHTML = '<i class="fas fa-filter"></i> Show Selected Only';
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('show_selected');
      window.history.replaceState({}, '', url.toString());
  }
  filterPapers();
}

updateSelectionCount();
}

function clearSelection() {
state.selectedPapers.clear();
state.onlyShowSelected = false;
document.querySelectorAll('.paper-card').forEach(card => {
  card.classList.remove('selected');
  const checkbox = card.querySelector('.selection-checkbox');
  if (checkbox) checkbox.checked = false;
});
document.getElementById('selectionPreview').innerHTML = '';

// Update button state
const button = document.querySelector('.preview-header-right .control-button.show-selected');
if (button) {
  button.innerHTML = '<i class="fas fa-filter"></i> Show Selected Only';
}

// Update URL and display
const url = new URL(window.location.href);
url.searchParams.delete('show_selected');
url.searchParams.delete('selected');
window.history.replaceState({}, '', url.toString());

updateSelectionCount();
filterPapers();
}

function togglePaperSelection(paperId, checkbox) {
if (!state.isSelectionMode) return;

const paperCard = checkbox.closest('.paper-card');
const paperRow = paperCard.closest('.paper-row');

if (checkbox.checked) {
  // Add to selection
  state.selectedPapers.add(paperId);
  paperCard.classList.add('selected');

  // Create preview item
  const title = paperRow.getAttribute('data-title');
  const authors = paperRow.getAttribute('data-authors');
  const year = paperRow.getAttribute('data-year');

  const previewItem = document.createElement('div');
  previewItem.className = 'preview-item';
  previewItem.setAttribute('data-paper-id', paperId);
  previewItem.innerHTML = `
      <div class="preview-content" onclick="scrollToPaper('${paperId}')">
          <div class="preview-title">${title} (${year})</div>
          <div class="preview-authors">${authors}</div>
      </div>
      <button class="preview-remove" onclick="event.stopPropagation(); removeFromSelection('${paperId}')">
          <i class="fas fa-times"></i>
      </button>
  `;
  document.getElementById('selectionPreview').appendChild(previewItem);
} else {
  removeFromSelection(paperId);
}
updateSelectionCount();
if (state.onlyShowSelected) {
  filterPapers();
}
updateURL();
}

function removeFromSelection(paperId) {
const checkbox = document.querySelector(`.paper-row[data-id="${paperId}"] .selection-checkbox`);
if (checkbox) {
  checkbox.checked = false;
  state.selectedPapers.delete(paperId);

  const paperCard = checkbox.closest('.paper-card');
  if (paperCard) {
      paperCard.classList.remove('selected');
  }

  const previewItem = document.querySelector(`.preview-item[data-paper-id="${paperId}"]`);
  if (previewItem) {
      previewItem.remove();
  }

  updateSelectionCount();
  if (state.onlyShowSelected) {
      filterPapers();
  }
  updateURL();
}
}

function updateSelectionCount() {
const counter = document.querySelector('.selection-counter');
counter.textContent = `${state.selectedPapers.size} paper${state.selectedPapers.size === 1 ? '' : 's'} selected`;
}

function handleCheckboxClick(ev, paperId, checkbox) {
ev.stopPropagation();
togglePaperSelection(paperId, checkbox);
}

function scrollToPaper(paperId) {
const paperRow = document.querySelector(`.paper-row[data-id="${paperId}"]`);
if (paperRow) {
  paperRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  
  const paperCard = paperRow.querySelector('.paper-card');
  if (paperCard) {
      paperCard.style.transition = 'background-color 0.3s ease';
      paperCard.style.backgroundColor = '#f0f9ff';
      setTimeout(() => {
          paperCard.style.backgroundColor = '';
      }, 1500);
  }
}
}
function showShareModal() {
if (state.selectedPapers.size === 0) {
  alert('Please select at least one paper to share.');
  return;
}
const shareUrl = new URL(window.location.href);
shareUrl.searchParams.set('selected', Array.from(state.selectedPapers).join(','));
if (state.onlyShowSelected) {
  shareUrl.searchParams.set('show_selected', 'true');
} else {
  shareUrl.searchParams.delete('show_selected');
}
document.getElementById('shareUrl').value = shareUrl.toString();
document.getElementById('shareModal').classList.add('show');
}

function hideShareModal() {
document.getElementById('shareModal').classList.remove('show');
}

async function copyShareLink() {
const shareUrl = document.getElementById('shareUrl');
try {
  await navigator.clipboard.writeText(shareUrl.value);
  const copyButton = document.querySelector('.share-url-container .control-button');
  const origText = copyButton.innerHTML;
  copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
  setTimeout(() => {
      copyButton.innerHTML = origText;
  }, 2000);
} catch(e) {
  alert('Failed to copy link. Please copy manually.');
}
}

function copyBitcoinAddress() {
const address = document.querySelector('.bitcoin-address').textContent;
navigator.clipboard.writeText(address).then(() => {
  const button = document.querySelector('.copy-button');
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-check"></i> Copied!';
  setTimeout(() => {
      button.innerHTML = originalText;
  }, 2000);
});
}

function applyURLParams() {
const params = new URLSearchParams(window.location.search);

// First, check if we have selected papers
const selPapers = params.get('selected');
if (selPapers) {
  const arr = selPapers.split(',');
  if (arr.length > 0) {
      // Enter selection mode
      if (!state.isSelectionMode) {
          toggleSelectionMode();
      }
      
      // Select the papers first
      arr.forEach(id => {
          const row = document.querySelector(`.paper-row[data-id="${id}"]`);
          if (row) {
              const cb = row.querySelector('.selection-checkbox');
              if (cb) {
                  cb.checked = true;
                  togglePaperSelection(id, cb);
              }
          }
      });
      
      // Then check if we should show only selected papers
      const showSelected = params.get('show_selected');
      if (showSelected === 'true') {
          state.onlyShowSelected = true;
          const button = document.querySelector('.preview-header-right .control-button.show-selected');
          if (button) {
              button.innerHTML = '<i class="fas fa-list"></i> Show All Papers';
          }
          filterPapers(); // Apply the filter to show only selected papers
      }
  }
}

// Handle other filters
const searchTerm = params.get('search');
if (searchTerm) {
  searchInput.value = searchTerm;
}

const yr = params.get('year');
if (yr) {
  yearFilter.value = yr;
}

const inc = params.get('include');
if (inc) {
  state.includeTags = new Set(inc.split(','));
  state.includeTags.forEach(t => {
      const tf = document.querySelector(`.tag-filter[data-tag="${t}"]`);
      if (tf) tf.classList.add('include');
  });
}

const exc = params.get('exclude');
if (exc) {
  state.excludeTags = new Set(exc.split(','));
  state.excludeTags.forEach(t => {
      const tf = document.querySelector(`.tag-filter[data-tag="${t}"]`);
      if (tf) tf.classList.add('exclude');
  });
}

// Final filter application
filterPapers();
}
// Navigation controls
function scrollToTop() {
window.scrollTo({
  top: 0,
  behavior: 'smooth'
});
}

function scrollToBottom() {
window.scrollTo({
  top: document.documentElement.scrollHeight,
  behavior: 'smooth'
});
}

// Update scroll progress
function updateScrollProgress() {
const winScroll = document.documentElement.scrollTop;
const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
const scrolled = Math.round((winScroll / height) * 100);
document.querySelector('.scroll-progress').textContent = `${scrolled}%`;
}

// Filter status functionality
function updateFilterStatus() {
const visiblePapers = document.querySelectorAll('.paper-row.visible').length;
const totalPapers = document.querySelectorAll('.paper-row').length;

document.getElementById('visibleCount').textContent = visiblePapers;
document.getElementById('totalCount').textContent = totalPapers;

const activeFiltersEl = document.getElementById('activeFilters');
activeFiltersEl.innerHTML = '';

// Search filter
const searchTerm = document.getElementById('searchInput').value;
if (searchTerm) {
  const searchTag = createFilterTag('search', 'Search Filter', searchTerm);
  searchTag.querySelector('button').addEventListener('click', () => {
      document.getElementById('searchInput').value = '';
      filterPapers();
  });
  activeFiltersEl.appendChild(searchTag);
}

// Year filter
const yearFilter = document.getElementById('yearFilter').value;
if (yearFilter !== 'all') {
  const yearTag = createFilterTag('year', 'Year Filter', yearFilter);
  yearTag.querySelector('button').addEventListener('click', () => {
      document.getElementById('yearFilter').value = 'all';
      filterPapers();
  });
  activeFiltersEl.appendChild(yearTag);
}

// Tag filters
document.querySelectorAll('.tag-filter').forEach(tagEl => {
  if (tagEl.classList.contains('include') || tagEl.classList.contains('exclude')) {
      const tagText = tagEl.getAttribute('data-tag');
      const type = tagEl.classList.contains('include') ? 'Including' : 'Excluding';
      const tagTag = createFilterTag('tag', `${type} Tag`, tagText);
      
      // Update the click handler to completely remove the tag
      tagTag.querySelector('button').addEventListener('click', () => {
          tagEl.classList.remove('include', 'exclude');
          state.includeTags.delete(tagText);
          state.excludeTags.delete(tagText);
          filterPapers();
      });
      
      activeFiltersEl.appendChild(tagTag);
  }
});
}

function createFilterTag(type, title, info) {
const tag = document.createElement('div');
tag.className = `filter-tag ${type}`;

tag.innerHTML = `
  <div class="filter-tag-content">
      <div class="filter-tag-title">${title}</div>
      <div class="filter-tag-info">${info}</div>
  </div>
  <button class="preview-remove" onclick="event.stopPropagation();" aria-label="Remove filter">
      <i class="fas fa-times"></i>
  </button>
`;

return tag;
}

function clearAllFilters() {
// Clear search
document.getElementById('searchInput').value = '';

// Reset year filter
document.getElementById('yearFilter').value = 'all';

// Clear all tag filters completely (don't toggle through states)
document.querySelectorAll('.tag-filter').forEach(tag => {
  tag.classList.remove('include', 'exclude');
  state.includeTags.delete(tag.getAttribute('data-tag'));
  state.excludeTags.delete(tag.getAttribute('data-tag'));
});

// Update the UI
filterPapers();
updateFilterStatus();
}


// Initialize
document.addEventListener('DOMContentLoaded', function() {
// Set initial paper counts
updateFilterStatus();

// Add scroll listener
window.addEventListener('scroll', updateScrollProgress);

// Override the existing filterPapers function to update filter status
const originalFilterPapers = window.filterPapers;
window.filterPapers = function() {
  originalFilterPapers();
  updateFilterStatus();
};
});
document.addEventListener('DOMContentLoaded', function() {
// Initialize variables
window.paperCards = document.querySelectorAll('.paper-row');
window.searchInput = document.getElementById('searchInput');
window.yearFilter = document.getElementById('yearFilter');
window.tagFilters = document.querySelectorAll('.tag-filter');

// Add toggleAbstract to window object so it's globally accessible
window.toggleAbstract = function(button) {
  const abstract = button.nextElementSibling;
  const isShowing = abstract.classList.toggle('show');
  button.innerHTML = isShowing ? '📖 Hide Abstract' : '📖 Show Abstract';
};

//用于可视化专利证书的
window.toggleCertificate = function(button) {
  const abstract = button.nextElementSibling;
  const isShowing = abstract.classList.toggle('show');
  button.innerHTML = isShowing ? '📕 Hide Certificate' : '📕 Certificate';
};

// Initialize LazyLoad
window.lazyLoadInstance = new LazyLoad({
  elements_selector: ".lazy",
  callback_error: (img) => {
      if (img.dataset.fallback) {
          img.src = img.dataset.fallback;
      }
  },
  callback_loaded: (img) => {
      img.classList.add('loaded');
  }
});

// Initialize filters
initializeFilters();

// Initialize paper card events
document.querySelectorAll('.paper-card').forEach(card => {
  card.addEventListener('click', (ev) => {
      if (!state.isSelectionMode) return;
      // if click on link or abstract btn, ignore
      if (
          ev.target.classList.contains('paper-link') ||
          ev.target.closest('.paper-link') ||
          ev.target.classList.contains('abstract-toggle')
      ) {
          return;
      }
      const checkbox = card.querySelector('.selection-checkbox');
      if (checkbox && ev.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          const pid = card.parentElement.getAttribute('data-id');
          togglePaperSelection(pid, checkbox);
      }
  });
});

// Apply URL parameters
applyURLParams();

// Show initial papers
filterPapers();
updatePaperNumbers();

// Expose global functions for HTML onclick handlers
window.copyBitcoinAddress = copyBitcoinAddress;
window.clearSearch = clearSearch;
window.toggleSelectionMode = toggleSelectionMode;
window.clearSelection = clearSelection;
window.showShareModal = showShareModal;
window.hideShareModal = hideShareModal;
window.copyShareLink = copyShareLink;
window.removeFromSelection = removeFromSelection;
window.togglePaperSelection = togglePaperSelection;
window.handleCheckboxClick = handleCheckboxClick;
window.scrollToPaper = scrollToPaper;
});