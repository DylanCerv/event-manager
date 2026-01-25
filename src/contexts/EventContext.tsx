import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
    getBoltEventsAPI, 
    createBoltEventAPI, 
    updateBoltEventAPI, 
    deleteBoltEventAPI,
} from '../endpoints/boltEvent';
import type { Event } from '../types/event';

let eventsFetchInFlight: Promise<void> | null = null;
let eventsFetchInFlightStartedAt = 0;

// Define the shape of our context
interface EventContextType {
    events: Event[];
    loading: boolean;
    error: string | null;
    fetchEvents: () => Promise<void>;
    getEventById: (id: string) => Event | undefined;
    createEvent: (eventData: object) => Promise<Event>;
    updateEvent: (id: string, eventData: object) => Promise<Event>;
    deleteEvent: (id: string) => Promise<void>;
    refreshEvents: () => Promise<void>;
}

// Create the context with a default value
const EventContext = createContext<EventContextType | undefined>(undefined);

// Custom hook to use the context
export const useEvents = () => {
    const context = useContext(EventContext);
    if (!context) {
        throw new Error('useEvents must be used within an EventProvider');
    }
    return context;
};

// Format ISO date to datetime-local input format (YYYY-MM-DDThh:mm)
const formatDateForInput = (isoDate: string): string => {
    if (!isoDate) return '';
    
    try {
        // Parse the ISO date
        const date = new Date(isoDate);
        
        // Get local date components with timezone adjustment
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        // Format to YYYY-MM-DDThh:mm (format required by datetime-local input)
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (error) {
        console.error('Error formatting date:', error);
        return '';
    }
};

// Map API response to local Event format
const mapApiEventToLocal = (apiEvent: any): Event => ({
    id: String(apiEvent.id),
    name: apiEvent.name,
    date: formatDateForInput(apiEvent.start_at), // Format date for input
    location: apiEvent.location,
    contractor_name: apiEvent.host_name,
    guest_count: apiEvent.guest_count,
    created_at: apiEvent.created_at,
    created_by: String(apiEvent.user_id || ''),
    logo_url: apiEvent.logo || undefined,
    qr_access_active: apiEvent.qr_access_active,
    is_finalized: apiEvent.is_finalized,
    status: apiEvent.status,
    request: apiEvent.request || undefined,
    // Nuevos campos para QR Access
    pre_activation_message: apiEvent.pre_activation_message,
    welcome_message: apiEvent.welcome_message,
    rejection_message: apiEvent.rejection_message,
});

// Provider component
export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const lastFetchTimeRef = React.useRef<number>(0);

    // Fetch all events
    const fetchEvents = useCallback(async (force = false) => {
        const now = Date.now();

        // Deduplicate concurrent (and StrictMode double-mount) calls.
        // If a fetch is already running, await it instead of starting another request.
        if (!force && eventsFetchInFlight && now - eventsFetchInFlightStartedAt < 15000) {
            return eventsFetchInFlight;
        }

        // Only fetch if it's been more than 30 seconds since last fetch
        if (!force && lastFetchTimeRef.current > 0 && now - lastFetchTimeRef.current < 30000) {
            return; // Use cached data
        }

        const doFetch = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await getBoltEventsAPI({
                    queryParams: {
                        include_requests: true
                    }
                });
                const apiEvents = response?.data || [];

                // Map API response to local Event format
                const mappedEvents = apiEvents.map(mapApiEventToLocal);

                setEvents(mappedEvents.sort((a: Event, b: Event) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                ));
                lastFetchTimeRef.current = Date.now();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch events');
                console.error('Error fetching events:', err);
            } finally {
                setLoading(false);
            }
        };

        eventsFetchInFlightStartedAt = now;
        eventsFetchInFlight = doFetch().finally(() => {
            eventsFetchInFlight = null;
        });

        return eventsFetchInFlight;
    }, []);

    // Force refresh events
    const refreshEvents = useCallback(async () => {
        return fetchEvents(true);
    }, [fetchEvents]);

    // Get event by ID
    const getEventById = useCallback((id: string) => {
        return events.find(event => event.id === id);
    }, [events]);

    // Create a new event
    const createEvent = useCallback(async (eventData: any): Promise<Event> => {
        try {
            setLoading(true);
            setError(null);

            const response = await createBoltEventAPI(eventData);
            const createdEvent = response?.data;

            if (!createdEvent) {
                throw new Error('Failed to create event');
            }

            const newEvent = mapApiEventToLocal(createdEvent);

            setEvents(prev => [newEvent, ...prev]);

            return newEvent;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create event');
            console.error('Error creating event:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Update an existing event
    const updateEvent = useCallback(async (id: string, eventData: any): Promise<Event> => {
        try {
            setLoading(true);
            setError(null);

            const response = await updateBoltEventAPI(Number(id), eventData);
            const updatedEvent = response?.data;

            if (!updatedEvent) {
                throw new Error('Failed to update event');
            }

            const mappedEvent = mapApiEventToLocal(updatedEvent);

            setEvents(prev => prev.map(event =>
                event.id === id ? mappedEvent : event
            ));

            return mappedEvent;
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to update event with ID ${id}`);
            console.error(`Error updating event with ID ${id}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Delete an event
    const deleteEvent = useCallback(async (id: string): Promise<void> => {
        try {
            setLoading(true);
            setError(null);

            await deleteBoltEventAPI(Number(id));

            setEvents(prev => prev.filter(event => event.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to delete event with ID ${id}`);
            console.error(`Error deleting event with ID ${id}:`, err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch events on component mount
    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const contextValue: EventContextType = {
        events,
        loading,
        error,
        fetchEvents: refreshEvents,
        getEventById,
        createEvent,
        updateEvent,
        deleteEvent,
        refreshEvents,
    };

    return (
        <EventContext.Provider value={contextValue}>
            {children}
        </EventContext.Provider>
    );
};
