import { createOptimizedPicture, getMetadata, toClassName } from '../../scripts/aem.js';
import {
  ul, li, a, img, span,
} from '../../scripts/dom-builder.js';
import ffetch from '../../scripts/ffetch.js';

const ARTICLE_INDEX = '/blog/articles-index.json';

const ARTICLE_FORMATTER = new Intl.DateTimeFormat('default', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

// TODO: change to web component once available
function renderCard(card) {
  const formattedDate = ARTICLE_FORMATTER.format(new Date(card.publicationDate * 1000));
  const cardclass = `card${card['hot story'] ? ' hot-story' : ''}`;
  const cardAuthorUrl = `/author/${toClassName(card.author).replace('-', '')}`; // TODO look up author URL from index
  const cardElement = li(
    { class: cardclass },
    a(
      { href: card.path },
      createOptimizedPicture(card.image, card.tile, false, [{ width: '750' }]),
      span({ class: 'template' }, card.template),
      span({ class: 'title' }, card.title),
    ),
    span(
      { class: 'author' },
      'By ',
      a({ href: cardAuthorUrl }, span(`${card.author}`)),
    ),

    span({ class: 'date' }, formattedDate),
  );
  return cardElement;
}

function getCategoryForReadMore() {
  const tags = getMetadata('article:tag').split(',');
  return tags.length > 0 ? tags[0] : null;
}

function determineContextFilter() {
  // for authors, filter by author
  if (window.location.pathname.startsWith('/author/') > 0) {
    return (entry) => entry.author === getMetadata('author');
  }

  // for topics get filter from URL
  if (window.location.pathname.startsWith('/topics/') > 0) {
    const topic = window.location.pathname.split('/')[2];
    return (entry) => toClassName(entry.topics).includes(topic);
  }

  // for tags get filter from URL
  if (window.location.pathname.startsWith('/tags/') > 0) {
    const tag = window.location.pathname.split('/')[2];
    return (entry) => JSON.parse(entry.tags).map((t) => toClassName(t)).includes(tag);
  }

  // for everything else, filter by category
  return (entry) => {
    const category = getCategoryForReadMore();
    return JSON.parse(entry.tags).includes(category);
  };
}

export default async function listArticles(block, config = { filter: null, maxEntries: null }) {
  let contextFilter = config.filter;
  if (!contextFilter) {
    contextFilter = determineContextFilter();
  }

  let articles = await ffetch(ARTICLE_INDEX)
    .filter(contextFilter);

  if (config.maxEntries !== null) {
    articles = await articles.limit(config.maxEntries);
  }

  articles = await articles.all();

  const cardList = ul({ class: 'article-list' });

  articles.forEach((article) => {
    const card = renderCard(article);
    cardList.append(card);
  });
  block.replaceWith(cardList);
}
