const AppFavorites = imports.ui.appFavorites;
const Main = imports.ui.main;

function init() {}

function enable() {
    Main.overview.dash._workId = Main.initializeDeferredWork(Main.overview.dash._box, function() {
        let favorites = AppFavorites.getAppFavorites().getFavoriteMap();

        let children = Main.overview.dash._box.get_children().filter(actor => {
            return actor.child &&
                   actor.child._delegate &&
                   actor.child._delegate.app;
        });

        // Apps currently in the dash
        let oldApps = children.map(actor => actor.child._delegate.app);

        // Apps supposed to be in the dash
        let newApps = [];

        for (let id in favorites)
            newApps.push(favorites[id]);

        // Figure out the actual changes to the list of items
        let addedItems = [];
        let removedActors = [];

        let newIndex = 0;
        let oldIndex = 0;
        while (newIndex < newApps.length || oldIndex < oldApps.length) {
            let oldApp = oldApps.length > oldIndex ? oldApps[oldIndex] : null;
            let newApp = newApps.length > newIndex ? newApps[newIndex] : null;

            // No change at oldIndex/newIndex
            if (oldApp == newApp) {
                oldIndex++;
                newIndex++;
                continue;
            }

            // App removed at oldIndex
            if (oldApp && !newApps.includes(oldApp)) {
                removedActors.push(children[oldIndex]);
                oldIndex++;
                continue;
            }

            // App added at newIndex
            if (newApp && !oldApps.includes(newApp)) {
                addedItems.push({ app: newApp,
                                  item: Main.overview.dash._createAppItem(newApp),
                                  pos: newIndex });
                newIndex++;
                continue;
            }

            // App moved
            let nextApp = newApps.length > newIndex + 1
                ? newApps[newIndex + 1] : null;
            let insertHere = nextApp && nextApp == oldApp;
            let alreadyRemoved = removedActors.reduce((result, actor) => {
                let removedApp = actor.child._delegate.app;
                return result || removedApp == newApp;
            }, false);

            if (insertHere || alreadyRemoved) {
                let newItem = Main.overview.dash._createAppItem(newApp);
                addedItems.push({ app: newApp,
                                  item: newItem,
                                  pos: newIndex + removedActors.length });
                newIndex++;
            } else {
                removedActors.push(children[oldIndex]);
                oldIndex++;
            }
        }

        for (let i = 0; i < addedItems.length; i++) {
            Main.overview.dash._box.insert_child_at_index(addedItems[i].item,
                                                          addedItems[i].pos);
        }

        for (let i = 0; i < removedActors.length; i++) {
            let item = removedActors[i];

            // Don't animate item removal when the overview is transitioning
            // or hidden
            if (Main.overview.visible && !Main.overview.animationInProgress)
                item.animateOutAndDestroy();
            else
                item.destroy();
        }

        Main.overview.dash._adjustIconSize();

        // Skip animations on first run when adding the initial set
        // of items, to avoid all items zooming in at once

        let animate = Main.overview.dash._shownInitially && Main.overview.visible &&
            !Main.overview.animationInProgress;

        if (!Main.overview.dash._shownInitially)
            Main.overview.dash._shownInitially = true;

        for (let i = 0; i < addedItems.length; i++)
            addedItems[i].item.show(animate);

        // Workaround for https://bugzilla.gnome.org/show_bug.cgi?id=692744
        // Without it, StBoxLayout may use a stale size cache
        Main.overview.dash._box.queue_relayout();
    });
}

function disable() {
    Main.overview.dash._workId = Main.initializeDeferredWork(Main.overview.dash._box, Main.overview.dash._redisplay.bind(Main.overview.dash));
}
