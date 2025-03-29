pub mod auth_new;
pub mod logger;

// Re-export the new authentication module as the default
pub use auth_new as auth; 