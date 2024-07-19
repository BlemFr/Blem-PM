import { action, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import { isAuthenticated } from '../plugin';
import open from 'open';

/**
 * An example action class that displays a count that increments by one each time the button is pressed.
 */
@action({ UUID: "com.blem.partymanager.increment" })
export class IncrementCounter extends SingletonAction<CounterSettings> {

    /**
     * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it become visible.
     * This could be due to the Stream Deck first starting up, or the user navigating between pages / folders etc.
     * In this example, we're setting the title to the "count" that is incremented in {@link IncrementCounter.onKeyDown}.
     */
    async onWillAppear(ev: WillAppearEvent<CounterSettings>): Promise<void> {
        const isAuth = await isAuthenticated();
        if (isAuth) {
            await ev.action.setTitle(`${ev.payload.settings.count ?? 0}`);
        } else {
            await ev.action.setTitle("Sign in");
        }
    }

    /**
     * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed.
     * In this example, our action will display a counter that increments by one each press.
     */
    async onKeyDown(ev: KeyDownEvent<CounterSettings>): Promise<void> {
        const isAuth = await isAuthenticated();
        if (isAuth) {
            let count = ev.payload.settings.count ?? 0;
            count++;
            await ev.action.setSettings({ count });
            await ev.action.setTitle(`${count}`);
        } else {
            // Open the authentication web page
            await open('http://localhost:5255/authenticate');
        }
    }
}

/**
 * Settings for {@link IncrementCounter}.
 */
type CounterSettings = {
    count: number;
};
