
#include "Types.cpp"
#include "Utils.cpp"
#include "json.hpp"
#include "Diagnostics.cpp"
#include "Extension.cpp"
#include <signal.h>

using namespace L10ns;
using json = nlohmann::json;

int child;

void kill_all_processes(int signum) {
    kill(child, SIGTERM);
    unlink("/tmp/l10ns.sock");
    exit(signum);
}

void run_extension_tests(Session* session) {
    string extension_file = join_paths(*session->root_dir, "Extension.json");

    auto for_each_compilation_test_file = [&](std::function<void (const string&)> callback) -> void {
        vector<string> comilation_test_files = find_files(*session->root_dir + "Tests/Cases/Compilations/*");
        for (auto const& f : comilation_test_files) {
            callback(f);
        }
    };

    auto for_each_key_extraction_test_file = [&](std::function<void (const string&)> callback) -> void {
        vector<string> comilation_test_files = find_files(*session->root_dir + "Tests/Cases/KeyExtractions/*");
        for (auto const& f : comilation_test_files) {
            callback(f);
        }
    };

    for_each_compilation_test_file([&](const string& test_file) {
        Extension extension = Extension::create(session, extension_file);
    });

    for_each_key_extraction_test_file([&](const string& test_file) {
        Extension extension = Extension::create(session, extension_file);
        int fd[2];
        pipe(fd);
        child = extension.start_server(fd);
        signal(SIGINT, kill_all_processes);
        char buf[1];
        read(fd[0], buf, 1);
        vector<string> files = { test_file };
        string localizations = extension.sync(files, extension.function_names);
        kill_all_processes(SIGTERM);
    });
}