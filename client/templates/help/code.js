import {Backdrop} from '/client/backdrop';
import {Lists} from '/client/model/lists';
import {Settings} from '/client/model/settings';
import {Overlay} from '/client/templates/overlay/code';

const allow = (executor) => block(executor, /*allow_input=*/true);

const block = (executor, allow_input) => {
  let done = false;
  let started = false;
  return () => {
    if (!started) {
      if (!allow_input) Overlay.blockInput();
      executor(() => done = true);
      started = true;
    }
    return done;
  }
}

const highlight = (selector, label) => () => {
  Overlay.blockInput();
  const elements = $(selector);
  if (elements.length === 0) return false;
  Overlay.show(elements, label);
  return true;
}

const sleep = (timeout) => block((done) => Meteor.setTimeout(done, timeout));

const waitOnEvent = (name) => allow((done) => $(window).one(name, done));

const waitOnTap = () => block((done) => $(window).one('click', done));

const waitOnUrl = (url) => () => {
  return window.location.pathname.substr(1) === url;
}

const runDemo = (demo) => {
  if (demo.length === 0) return Overlay.hide();
  if (demo[0]()) return runDemo(demo.slice(1));
  const ticker = createjs.Ticker.addEventListener('tick', () => {
    if (demo[0]()) {
      createjs.Ticker.removeEventListener('tick', ticker);
      runDemo(demo.slice(1));
    }
  });
}

const kDemoInitializer = [
  () => {
    Settings.set('paper_filter', false);
    return true;
  },
  sleep(600),
];

const kDemos = {
  practice_writing: [
    highlight('.lists', 'First, enable a word list. ' +
                        'From the main menu, tap "Lists".'),
    waitOnUrl('lists'),
    highlight('.block:first-child', 'Use the toggle to enable the list.'),
    () => Lists.get('100cr'),
    sleep(500),
    highlight('.back-button', 'Now, go back to the main menu.'),
    waitOnUrl(''),
    highlight('.teach', 'Tap "Write" to start studying.'),
    waitOnUrl('teach'),
    highlight('.prompt', "At the top of this page, you'll see " +
                         'the pinyin and definition of a word.'),
    waitOnTap(),
    highlight('.flashcard', 'Your goal is to write that word character-by-' +
                            'character. Remember that stroke order matters.'),
    waitOnTap(),
    highlight('.flashcard', 'The first character of Zhōngwén ("Chinese") ' +
                            'is 中. Try writing it now!'),
    waitOnEvent('makemeahanzi-character-complete'),
    highlight('.flashcard', 'Inkstone automatically grades your writing. ' +
                            'Swipe up to change your grade, ' +
                            'or tap to move on.'),
    waitOnEvent('makemeahanzi-next-character'),
    highlight('.flashcard', 'Now, write the second character of Zhōngwén. ' +
                            'Tap for a hint. Double-tap for the answer.'),
    waitOnEvent('makemeahanzi-character-complete'),
    highlight('.flashcard', 'Great job! Tap to move ' +
                            'on to the next flashcard.'),
    waitOnEvent('makemeahanzi-next-character'),
    highlight('.info.right', 'The number of cards remaining is shown ' +
                             'in the top right corner.'),
    waitOnTap(),
    () => {
      Settings.set('max_adds', 0);
      Settings.set('max_reviews', 0);
      Settings.set('revisit_failures', false);
      return true;
    },
    highlight('.flashcard.errors', 'After completing all cards scheduled ' +
                                   'for the day, you have the option to ' +
                                   'add some extra cards.'),
    waitOnTap(),
    highlight('.control.right', 'While studying, use the "learn" button to ' +
                                'find out more about characters in the ' +
                                'current word.'),
    waitOnTap(),
    highlight('.control.left', 'Use the "home" button to go ' +
                               'back to the main menu.'),
    waitOnTap(),
  ],
};

const params = new ReactiveDict();

Template.demo.helpers({get: (key) => params.get(key)});

Template.help.events({
  'click .item.help-item': function(event) {
    params.clear();
    params.set('topic', this.topic);
    Backdrop.show();
  },
});

Meteor.startup(() => {
  const index = window.location.search.indexOf('demo=');
  if (index < 0) return;
  Template.layout.onRendered(() => {
    parent.postMessage('Demo iframe loaded.', '*');
    const topic = window.location.search.substr(index + 5);
    runDemo(kDemoInitializer.concat(kDemos[topic] || []));
  });
});

window.addEventListener('message', (event) => {
  if (event.data === 'Demo iframe loaded.') {
    params.set('transform', 'translateY(0)');
    Backdrop.hide();
  }
});
